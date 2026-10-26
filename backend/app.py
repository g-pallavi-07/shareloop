import logging
import os
import re
import secrets
import uuid
from datetime import date, timedelta
from functools import wraps
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, g, jsonify, request, send_from_directory, session
from flask_cors import CORS
from pymysql.err import IntegrityError
from werkzeug.exceptions import HTTPException
from werkzeug.security import check_password_hash, generate_password_hash

try:
    from .db import close_db, database_config, get_db
except ImportError:
    from db import close_db, database_config, get_db

load_dotenv()

CONDITION_VALUES = {"like new": "Like New", "good": "Good", "fair": "Fair", "well used": "Well Used"}
LISTING_TYPES = {"sale", "borrow", "free"}
SORT_COLUMNS = {
    "newest": "l.created_at DESC",
    "price-asc": "l.price ASC, l.created_at DESC",
    "price-desc": "l.price DESC, l.created_at DESC",
}
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.update(
        SECRET_KEY=os.getenv("SECRET_KEY") or secrets.token_hex(32),
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=os.getenv("COOKIE_SECURE", "false").lower() == "true",
        PERMANENT_SESSION_LIFETIME=timedelta(minutes=30),
        MAX_CONTENT_LENGTH=5 * 1024 * 1024,
        UPLOAD_FOLDER=os.getenv(
            "UPLOAD_FOLDER", str(Path(__file__).resolve().parent.parent / "instance" / "uploads")
        ),
        **database_config(),
    )
    if test_config:
        app.config.update(test_config)
    CORS(
        app,
        origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")],
        supports_credentials=True,
    )
    app.teardown_appcontext(close_db)

    @app.errorhandler(413)
    def file_too_large(_error):
        return error("Image exceeds the 5 MB upload limit.", 413)

    @app.errorhandler(HTTPException)
    def http_error(exc):
        return error(exc.description, exc.code)

    @app.errorhandler(Exception)
    def unexpected_error(exc):
        app.logger.exception("Unhandled application error: %s", exc)
        return error("The server could not complete the request.", 500)

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "database": "not_checked"})

    @app.post("/api/auth/register")
    def register():
        data = body()
        name = clean_text(data.get("full_name") or data.get("name"), 120)
        email = clean_text(data.get("college_email") or data.get("email"), 190).lower()
        password = data.get("password", "")
        department = clean_text(data.get("department"), 120)
        year = clean_text(data.get("college_year") or data.get("year"), 40)
        if not name or not EMAIL_PATTERN.match(email) or not department or not year:
            return error("Enter a name, valid college email, department, and year.")
        if not isinstance(password, str) or len(password) < 8:
            return error("Password must contain at least 8 characters.")
        allowed_domains = [v.strip().lower() for v in os.getenv("COLLEGE_EMAIL_DOMAINS", "").split(",") if v.strip()]
        if allowed_domains and email.rsplit("@", 1)[1] not in allowed_domains:
            return error("Use an email address from an approved college domain.", 403)
        db = get_db()
        try:
            with db.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO Users (full_name, college_email, password_hash, department, college_year) "
                    "VALUES (%s, %s, %s, %s, %s)",
                    (name, email, generate_password_hash(password), department, year),
                )
                user_id = cursor.lastrowid
        except IntegrityError:
            db.rollback()
            return error("An account with this email already exists.", 409)
        db.commit()
        session.clear()
        session["user_id"] = user_id
        session.permanent = True
        return jsonify({"user": user_payload(get_user(user_id))}), 201

    @app.post("/api/auth/login")
    def login():
        data = body()
        email = clean_text(data.get("college_email") or data.get("email"), 190).lower()
        password = data.get("password", "")
        if not email or not password:
            return error("Enter your email and password.")
        with get_db().cursor() as cursor:
            cursor.execute("SELECT * FROM Users WHERE college_email=%s", (email,))
            user = cursor.fetchone()
        if not user or not check_password_hash(user["password_hash"], password):
            return error("Email or password is incorrect.", 401)
        if user["account_status"] != "active":
            return error("This account is suspended. Contact an administrator.", 403)
        session.clear()
        session["user_id"] = user["user_id"]
        session.permanent = True
        return jsonify({"user": user_payload(user)})

    @app.post("/api/auth/logout")
    def logout():
        session.clear()
        return jsonify({"success": True})

    @app.get("/api/auth/me")
    @authenticated
    def me():
        return jsonify({"user": user_payload(g.user)})

    @app.patch("/api/users/me")
    @authenticated
    def update_me():
        data = body()
        fields = {
            "full_name": clean_text(data.get("full_name"), 120),
            "department": clean_text(data.get("department"), 120),
            "college_year": clean_text(data.get("college_year"), 40),
            "phone": clean_text(data.get("phone"), 32) or None,
        }
        fields = {key: value for key, value in fields.items() if value is not None}
        if not fields:
            return error("No valid profile fields were provided.")
        set_clause = ", ".join(f"{field}=%s" for field in fields)
        with get_db().cursor() as cursor:
            cursor.execute(
                f"UPDATE Users SET {set_clause}, updated_at=CURRENT_TIMESTAMP WHERE user_id=%s",
                (*fields.values(), g.user["user_id"]),
            )
        get_db().commit()
        return jsonify({"user": user_payload(get_user(g.user["user_id"]))})

    @app.post("/api/users/change-password")
    @authenticated
    def change_password():
        data = body()
        new_password = data.get("new_password", "")
        if len(new_password) < 8:
            return error("New password must contain at least 8 characters.")
        if not check_password_hash(g.user["password_hash"], data.get("current_password", "")):
            return error("Current password is incorrect.", 400)
        with get_db().cursor() as cursor:
            cursor.execute(
                "UPDATE Users SET password_hash=%s, updated_at=CURRENT_TIMESTAMP WHERE user_id=%s",
                (generate_password_hash(new_password), g.user["user_id"]),
            )
        get_db().commit()
        session.clear()
        return jsonify({"success": True})

    @app.get("/api/categories")
    def categories():
        with get_db().cursor() as cursor:
            cursor.execute("SELECT category_id, category_name FROM Categories WHERE is_active=1 ORDER BY category_name")
            rows = cursor.fetchall()
        return jsonify({"categories": [{"id": slug(row["category_name"]), "name": row["category_name"]} for row in rows]})

    @app.get("/api/listings")
    def listings():
        filters = ["l.status='available'", "u.account_status='active'"]
        params = []
        query = request.args.get("q", request.args.get("query", "")).strip()
        category = request.args.get("category", "")
        listing_type = request.args.get("type", "")
        condition = request.args.get("condition", "")
        min_price, max_price = request.args.get("minPrice"), request.args.get("maxPrice")
        if query:
            filters.append("(l.title LIKE %s OR l.description LIKE %s)")
            params.extend([f"%{query}%", f"%{query}%"])
        if category and category != "all":
            filters.append("LOWER(REPLACE(REPLACE(c.category_name, ' & ', '-'), ' ', '-'))=%s")
            params.append(category_db_slug(category.lower()))
        if listing_type and listing_type != "all":
            if listing_type not in LISTING_TYPES:
                return error("Invalid listing type.")
            filters.append("l.listing_type=%s")
            params.append(listing_type)
        if condition:
            normalized = condition.replace("-", " ").lower()
            if normalized not in CONDITION_VALUES:
                return error("Invalid item condition.")
            filters.append("l.item_condition=%s")
            params.append(CONDITION_VALUES[normalized])
        for value, operator in ((min_price, ">="), (max_price, "<=")):
            if value is not None:
                try:
                    amount = float(value)
                    if amount < 0:
                        raise ValueError
                except ValueError:
                    return error("Price filters must be non-negative numbers.")
                filters.append(f"(l.price IS NULL OR l.price {operator} %s)")
                params.append(amount)
        where_clause = " AND ".join(filters)
        order_by = SORT_COLUMNS.get(request.args.get("sort", "newest"))
        if not order_by:
            return error("Invalid sort order.")
        page, per_page = page_args()
        with get_db().cursor() as cursor:
            cursor.execute(
                "SELECT COUNT(*) AS total FROM Listings l JOIN Users u ON u.user_id=l.seller_id "
                "JOIN Categories c ON c.category_id=l.category_id WHERE " + where_clause,
                params,
            )
            total = cursor.fetchone()["total"]
            cursor.execute(
                listing_select() + " WHERE " + where_clause + f" ORDER BY {order_by} LIMIT %s OFFSET %s",
                (*params, per_page, (page - 1) * per_page),
            )
            rows = cursor.fetchall()
        return jsonify({"listings": [listing_payload(row) for row in rows], "total": total, "page": page, "per_page": per_page})

    @app.get("/api/listings/featured")
    def featured():
        with get_db().cursor() as cursor:
            cursor.execute(listing_select() + " WHERE l.status='available' AND u.account_status='active' ORDER BY l.created_at DESC LIMIT 8")
            rows = cursor.fetchall()
        return jsonify({"listings": [listing_payload(row) for row in rows]})

    @app.get("/api/listings/mine")
    @authenticated
    def my_listings():
        with get_db().cursor() as cursor:
            cursor.execute(listing_select() + " WHERE l.seller_id=%s AND l.status!='removed' ORDER BY l.created_at DESC", (g.user["user_id"],))
            rows = cursor.fetchall()
        return jsonify({"listings": [listing_payload(row) for row in rows]})

    @app.get("/api/listings/<int:listing_id>")
    def listing_detail(listing_id):
        with get_db().cursor() as cursor:
            cursor.execute(
                listing_select() + " WHERE l.listing_id=%s AND l.status!='removed' AND u.account_status='active'",
                (listing_id,),
            )
            row = cursor.fetchone()
        if not row:
            return error("Listing not found.", 404)
        return jsonify({"listing": listing_payload(row)})

    @app.post("/api/listings")
    @authenticated
    def create_listing():
        data = body()
        values, validation_error = validate_listing(data)
        if validation_error:
            return error(validation_error)
        db = get_db()
        try:
            with db.cursor() as cursor:
                cursor.execute(
                    "SELECT category_id FROM Categories WHERE is_active=1 AND "
                    "LOWER(REPLACE(REPLACE(category_name,' & ','-'),' ','-'))=%s",
                    (category_db_slug(values["category"]),),
                )
                category = cursor.fetchone()
                if not category:
                    return error("Select a valid category.")
                cursor.execute(
                    "INSERT INTO Listings (seller_id, category_id, title, description, listing_type, price, "
                    "borrow_duration,item_condition, quantity) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                    (g.user["user_id"], category["category_id"], values["title"], values["description"], values["listing_type"], values["price"], values["borrow_duration"], values["condition"], values["quantity"]),
                )
                listing_id = cursor.lastrowid
                for index, image in enumerate(values["images"]):
                    cursor.execute(
                        "INSERT INTO ListingImages (listing_id,image_url,is_primary) VALUES (%s,%s,%s)",
                        (listing_id, image, index == 0),
                    )
            db.commit()
        except Exception:
            db.rollback()
            raise
        return jsonify({"listing": get_listing(listing_id)}), 201

    @app.patch("/api/listings/<int:listing_id>")
    @authenticated
    def edit_listing(listing_id):
        data = body()
        current = get_listing_row(listing_id)
        if not current:
            return error("Listing not found.", 404)
        if current["seller_id"] != g.user["user_id"]:
            return error("You may only edit your own listings.", 403)
        current["category"] = slug(current["category_name"])
        values, validation_error = validate_listing(data, partial=True, current=current)
        if validation_error:
            return error(validation_error)
        if "category" in data:
            with get_db().cursor() as cursor:
                cursor.execute(
                    "SELECT category_id FROM Categories WHERE is_active=1 AND "
                    "LOWER(REPLACE(REPLACE(category_name,' & ','-'),' ','-'))=%s",
                    (category_db_slug(values["category"]),),
                )
                category = cursor.fetchone()
            if not category:
                return error("Select a valid category.")
            values["category_id"] = category["category_id"]
        property_columns = {
            "title": "title",
            "description": "description",
            "type": "listing_type",
            "listing_type": "listing_type",
            "price": "price",
            "borrowDuration": "borrow_duration",
            "condition": "item_condition",
            "item_condition": "item_condition",
            "quantity": "quantity",
        }
        updates = {property_columns[key]: values[key] for key in data if key in property_columns}
        if "borrowDuration" in data or "type" in data or "listing_type" in data:
            updates["borrow_duration"] = values["borrow_duration"]
        if "type" in data or "listing_type" in data:
            updates["price"] = values["price"]
        if "category" in data:
            updates["category_id"] = values["category_id"]
        if "status" in data:
            if data["status"] not in {"available", "unavailable"}:
                return error("Listing status must be available or unavailable.")
            if data["status"] == "available" and current["quantity"] < 1:
                return error("A listing with no remaining quantity cannot be made available.")
            updates["status"] = data["status"]
        if updates:
            clause = ", ".join(f"{key}=%s" for key in updates)
            with get_db().cursor() as cursor:
                cursor.execute(f"UPDATE Listings SET {clause}, updated_at=CURRENT_TIMESTAMP WHERE listing_id=%s", (*updates.values(), listing_id))
            get_db().commit()
        return jsonify({"listing": get_listing(listing_id)})

    @app.delete("/api/listings/<int:listing_id>")
    @authenticated
    def remove_listing(listing_id):
        with get_db().cursor() as cursor:
            cursor.execute("SELECT seller_id FROM Listings WHERE listing_id=%s AND status!='removed'", (listing_id,))
            row = cursor.fetchone()
            if not row:
                return error("Listing not found.", 404)
            if row["seller_id"] != g.user["user_id"] and g.user["role"] != "admin":
                return error("You may only remove your own listings.", 403)
            cursor.execute("UPDATE Listings SET status='removed', updated_at=CURRENT_TIMESTAMP WHERE listing_id=%s", (listing_id,))
        get_db().commit()
        return jsonify({"success": True, "id": listing_id})

    @app.get("/api/favorites")
    @authenticated
    def favorites():
        with get_db().cursor() as cursor:
            cursor.execute(
                listing_select() + " JOIN Favorites f ON f.listing_id=l.listing_id "
                "WHERE f.user_id=%s AND l.status!='removed' ORDER BY f.created_at DESC",
                (g.user["user_id"],),
            )
            rows = cursor.fetchall()
        return jsonify({"listings": [listing_payload(row) for row in rows]})

    @app.post("/api/favorites/<int:listing_id>")
    @authenticated
    def add_favorite(listing_id):
        with get_db().cursor() as cursor:
            cursor.execute("SELECT listing_id FROM Listings WHERE listing_id=%s AND status='available'", (listing_id,))
            if not cursor.fetchone():
                return error("Listing not found.", 404)
            cursor.execute("INSERT IGNORE INTO Favorites (user_id,listing_id) VALUES (%s,%s)", (g.user["user_id"], listing_id))
        get_db().commit()
        return jsonify({"success": True})

    @app.delete("/api/favorites/<int:listing_id>")
    @authenticated
    def delete_favorite(listing_id):
        with get_db().cursor() as cursor:
            cursor.execute("DELETE FROM Favorites WHERE user_id=%s AND listing_id=%s", (g.user["user_id"], listing_id))
        get_db().commit()
        return jsonify({"success": True})

    @app.get("/api/favorites/check/<int:listing_id>")
    @authenticated
    def favorite_check(listing_id):
        with get_db().cursor() as cursor:
            cursor.execute("SELECT 1 FROM Favorites WHERE user_id=%s AND listing_id=%s", (g.user["user_id"], listing_id))
            exists = cursor.fetchone() is not None
        return jsonify({"is_favorite": exists})

    @app.post("/api/orders")
    @authenticated
    def create_order():
        data = body()
        try:
            listing_id = int(data.get("listing_id") or data.get("listingId"))
        except (TypeError, ValueError):
            return error("A valid listing_id is required.")
        db = get_db()
        try:
            with db.cursor() as cursor:
                cursor.execute(
                    "SELECT l.*,u.account_status AS seller_status FROM Listings l "
                    "JOIN Users u ON u.user_id=l.seller_id WHERE l.listing_id=%s FOR UPDATE",
                    (listing_id,),
                )
                listing = cursor.fetchone()
                if not listing or listing["seller_status"] != "active" or listing["status"] != "available" or listing["quantity"] < 1:
                    return error("This listing is not available.", 409)
                if listing["seller_id"] == g.user["user_id"]:
                    return error("You cannot request your own listing.", 400)
                order_type = "borrow" if listing["listing_type"] == "borrow" else "purchase"
                return_date = parse_date(data.get("expected_return_date") or data.get("expectedReturnDate"))
                if order_type == "borrow" and (not return_date or return_date <= date.today()):
                    return error("Borrow requests need a future expected_return_date.")
                cursor.execute(
                    "INSERT INTO Orders (buyer_id,seller_id,transaction_type,expected_return_date,buyer_note) "
                    "VALUES (%s,%s,%s,%s,%s)",
                    (g.user["user_id"], listing["seller_id"], order_type, return_date if order_type == "borrow" else None, clean_text(data.get("buyer_note") or data.get("message"), 1000)),
                )
                order_id = cursor.lastrowid
                cursor.execute(
                    "INSERT INTO OrderItems (order_id,listing_id,quantity,unit_price) VALUES (%s,%s,1,%s)",
                    (order_id, listing_id, listing["price"] or 0),
                )
                create_notification(cursor, listing["seller_id"], order_id, "request_received", "You received a new listing request.")
            db.commit()
        except Exception:
            db.rollback()
            raise
        return jsonify({"order": get_order(order_id, g.user["user_id"])}), 201

    @app.get("/api/orders")
    @authenticated
    def orders():
        return order_list("o.buyer_id=%s OR o.seller_id=%s", (g.user["user_id"], g.user["user_id"]))

    @app.get("/api/orders/incoming")
    @authenticated
    def incoming_orders():
        return order_list("o.seller_id=%s", (g.user["user_id"],))

    @app.get("/api/orders/outgoing")
    @authenticated
    def outgoing_orders():
        return order_list("o.buyer_id=%s", (g.user["user_id"],))

    @app.get("/api/orders/<int:order_id>")
    @authenticated
    def order_detail(order_id):
        result = get_order(order_id, g.user["user_id"])
        return jsonify({"order": result}) if result else error("Order not found.", 404)

    @app.patch("/api/orders/<int:order_id>/<action>")
    @authenticated
    def change_order(order_id, action):
        if action not in {"accept", "reject", "cancel", "complete", "return"}:
            return error("Unknown order action.", 404)
        db = get_db()
        try:
            with db.cursor() as cursor:
                cursor.execute(
                    "SELECT o.*, oi.listing_id, oi.quantity FROM Orders o JOIN OrderItems oi ON oi.order_id=o.order_id "
                    "WHERE o.order_id=%s FOR UPDATE",
                    (order_id,),
                )
                order = cursor.fetchone()
                if not order:
                    return error("Order not found.", 404)
                if action in {"accept", "reject"} and order["seller_id"] != g.user["user_id"]:
                    return error("Only the seller can respond to this request.", 403)
                if action in {"cancel"} and order["buyer_id"] != g.user["user_id"]:
                    return error("Only the buyer can cancel this request.", 403)
                if action in {"complete", "return"} and g.user["user_id"] not in {order["buyer_id"], order["seller_id"]}:
                    return error("You are not a participant in this transaction.", 403)
                if action == "accept":
                    if order["status"] != "pending":
                        return error("Only pending requests can be accepted.", 409)
                    cursor.execute("SELECT quantity,status FROM Listings WHERE listing_id=%s FOR UPDATE", (order["listing_id"],))
                    listing = cursor.fetchone()
                    if not listing or listing["status"] != "available" or listing["quantity"] < order["quantity"]:
                        return error("There is not enough available inventory.", 409)
                    cursor.execute("UPDATE Listings SET quantity=quantity-%s, updated_at=CURRENT_TIMESTAMP WHERE listing_id=%s", (order["quantity"], order["listing_id"]))
                    cursor.execute("UPDATE Listings SET status=IF(quantity=0,'unavailable','available') WHERE listing_id=%s", (order["listing_id"],))
                    cursor.execute("UPDATE Orders SET status='accepted' WHERE order_id=%s", (order_id,))
                    create_notification(cursor, order["buyer_id"], order_id, "request_accepted", "Your request was accepted.")
                elif action == "reject":
                    if order["status"] != "pending":
                        return error("Only pending requests can be rejected.", 409)
                    cursor.execute("UPDATE Orders SET status='rejected' WHERE order_id=%s", (order_id,))
                    create_notification(cursor, order["buyer_id"], order_id, "request_rejected", "Your request was declined.")
                elif action == "cancel":
                    if order["status"] != "pending":
                        return error("Only pending requests can be cancelled.", 409)
                    cursor.execute("UPDATE Orders SET status='cancelled' WHERE order_id=%s", (order_id,))
                elif action == "complete":
                    if order["transaction_type"] != "purchase" or order["status"] != "accepted":
                        return error("Only accepted purchases can be completed with this action.", 409)
                    cursor.execute("UPDATE Orders SET status='completed', completed_at=CURRENT_TIMESTAMP WHERE order_id=%s", (order_id,))
                elif action == "return":
                    if order["transaction_type"] != "borrow" or order["status"] != "accepted":
                        return error("Only accepted borrow transactions can be returned.", 409)
                    cursor.execute("UPDATE Orders SET status='completed', actual_return_date=%s, completed_at=CURRENT_TIMESTAMP WHERE order_id=%s", (date.today(), order_id))
                    cursor.execute("UPDATE Listings SET quantity=quantity+%s, status='available', updated_at=CURRENT_TIMESTAMP WHERE listing_id=%s", (order["quantity"], order["listing_id"]))
                    create_notification(cursor, order["seller_id"], order_id, "borrow_returned", "A borrowed item has been marked returned.")
            db.commit()
        except Exception:
            db.rollback()
            raise
        return jsonify({"order": get_order(order_id, g.user["user_id"])})

    @app.post("/api/reviews")
    @authenticated
    def add_review():
        data = body()
        try:
            order_id, rating = int(data.get("order_id")), int(data.get("rating"))
        except (TypeError, ValueError):
            return error("A valid order_id and rating are required.")
        if not 1 <= rating <= 5:
            return error("Rating must be between 1 and 5.")
        try:
            with get_db().cursor() as cursor:
                cursor.execute("SELECT buyer_id,seller_id,status FROM Orders WHERE order_id=%s", (order_id,))
                order = cursor.fetchone()
                if not order or order["status"] != "completed" or g.user["user_id"] not in {order["buyer_id"], order["seller_id"]}:
                    return error("Reviews are available only to participants after a completed transaction.", 403)
                reviewee = order["seller_id"] if g.user["user_id"] == order["buyer_id"] else order["buyer_id"]
                cursor.execute(
                    "INSERT INTO Reviews (order_id,reviewer_id,reviewee_id,rating,comment) VALUES (%s,%s,%s,%s,%s)",
                    (order_id, g.user["user_id"], reviewee, rating, clean_text(data.get("comment"), 2000)),
                )
        except IntegrityError:
            get_db().rollback()
            return error("You already reviewed this transaction.", 409)
        get_db().commit()
        return jsonify({"success": True}), 201

    @app.get("/api/users/<int:user_id>/reviews")
    def user_reviews(user_id):
        with get_db().cursor() as cursor:
            cursor.execute(
                "SELECT r.rating,r.comment,r.created_at,u.full_name AS reviewer_name FROM Reviews r "
                "JOIN Users u ON u.user_id=r.reviewer_id WHERE r.reviewee_id=%s ORDER BY r.created_at DESC",
                (user_id,),
            )
            reviews = cursor.fetchall()
            cursor.execute("SELECT AVG(rating) AS average_rating,COUNT(*) AS review_count FROM Reviews WHERE reviewee_id=%s", (user_id,))
            summary = cursor.fetchone()
        return jsonify({"reviews": reviews, "average_rating": float(summary["average_rating"] or 0), "review_count": summary["review_count"]})

    @app.post("/api/reports")
    @authenticated
    def submit_report():
        data = body()
        listing_id = data.get("listing_id")
        reported_user_id = data.get("reported_user_id")
        if bool(listing_id) == bool(reported_user_id):
            return error("A report must target exactly one listing or user.")
        reason = clean_text(data.get("reason"), 120)
        if not reason:
            return error("A report reason is required.")
        with get_db().cursor() as cursor:
            cursor.execute(
                "INSERT INTO Reports (reporter_id,listing_id,reported_user_id,reason,details) VALUES (%s,%s,%s,%s,%s)",
                (g.user["user_id"], listing_id, reported_user_id, reason, clean_text(data.get("details"), 2000)),
            )
        get_db().commit()
        return jsonify({"success": True}), 201

    @app.get("/api/reports")
    @authenticated
    def list_reports():
        if g.user["role"] != "admin":
            return error("Administrator access is required.", 403)
        with get_db().cursor() as cursor:
            cursor.execute("SELECT * FROM Reports ORDER BY created_at DESC")
            rows = cursor.fetchall()
        return jsonify({"reports": rows})

    @app.patch("/api/reports/<int:report_id>")
    @authenticated
    def update_report(report_id):
        if g.user["role"] != "admin":
            return error("Administrator access is required.", 403)
        status = body().get("status")
        if status not in {"open", "reviewing", "resolved", "dismissed"}:
            return error("Invalid report status.")
        with get_db().cursor() as cursor:
            cursor.execute("UPDATE Reports SET status=%s,resolved_at=IF(%s IN ('resolved','dismissed'),CURRENT_TIMESTAMP,NULL) WHERE report_id=%s", (status, status, report_id))
            if cursor.rowcount == 0:
                return error("Report not found.", 404)
        get_db().commit()
        return jsonify({"success": True})

    @app.get("/api/notifications")
    @authenticated
    def notifications():
        with get_db().cursor() as cursor:
            cursor.execute("SELECT * FROM Notifications WHERE user_id=%s ORDER BY created_at DESC LIMIT 100", (g.user["user_id"],))
            rows = cursor.fetchall()
        return jsonify({"notifications": rows})

    @app.patch("/api/notifications/read-all")
    @authenticated
    def read_all_notifications():
        with get_db().cursor() as cursor:
            cursor.execute("UPDATE Notifications SET is_read=1 WHERE user_id=%s", (g.user["user_id"],))
        get_db().commit()
        return jsonify({"success": True})

    @app.patch("/api/notifications/<int:notification_id>/read")
    @authenticated
    def read_notification(notification_id):
        with get_db().cursor() as cursor:
            cursor.execute("UPDATE Notifications SET is_read=1 WHERE notification_id=%s AND user_id=%s", (notification_id, g.user["user_id"]))
            if not cursor.rowcount:
                return error("Notification not found.", 404)
        get_db().commit()
        return jsonify({"success": True})

    @app.post("/api/handover")
    @authenticated
    def create_handover():
        data = body()
        try:
            order_id = int(data.get("order_id"))
        except (TypeError, ValueError):
            return error("A valid order_id is required.")
        handover_type = data.get("handover_type")
        if handover_type not in {"collection", "return"}:
            return error("Handover type must be collection or return.")
        with get_db().cursor() as cursor:
            cursor.execute("SELECT buyer_id,seller_id,transaction_type,status FROM Orders WHERE order_id=%s", (order_id,))
            order = cursor.fetchone()
            if not order or g.user["user_id"] not in {order["buyer_id"], order["seller_id"]} or order["status"] != "accepted":
                return error("Only participants in accepted orders can record a handover.", 403)
            if handover_type == "return" and order["transaction_type"] != "borrow":
                return error("Return handovers apply only to borrow transactions.")
            cursor.execute(
                "INSERT INTO HandoverRecords (order_id,handover_type,confirmed_by,notes) VALUES (%s,%s,%s,%s)",
                (order_id, handover_type, g.user["user_id"], clean_text(data.get("notes"), 1000)),
            )
            handover_id = cursor.lastrowid
        get_db().commit()
        return jsonify({"handover_id": handover_id, "confirmation_status": "pending"}), 201

    @app.patch("/api/handover/<int:handover_id>/confirm")
    @authenticated
    def confirm_handover(handover_id):
        with get_db().cursor() as cursor:
            cursor.execute(
                "SELECT h.*,o.buyer_id,o.seller_id FROM HandoverRecords h JOIN Orders o ON o.order_id=h.order_id "
                "WHERE h.handover_id=%s",
                (handover_id,),
            )
            record = cursor.fetchone()
            if not record or g.user["user_id"] not in {record["buyer_id"], record["seller_id"]}:
                return error("Handover not found.", 404)
            if record["confirmed_by"] == g.user["user_id"]:
                return error("The other transaction participant must confirm this handover.", 403)
            cursor.execute(
                "UPDATE HandoverRecords SET confirmation_status='confirmed',confirmed_at=CURRENT_TIMESTAMP WHERE handover_id=%s",
                (handover_id,),
            )
        get_db().commit()
        return jsonify({"success": True})

    @app.get("/api/orders/<int:order_id>/handovers")
    @authenticated
    def order_handovers(order_id):
        with get_db().cursor() as cursor:
            cursor.execute("SELECT buyer_id,seller_id FROM Orders WHERE order_id=%s", (order_id,))
            order = cursor.fetchone()
            if not order or g.user["user_id"] not in {order["buyer_id"], order["seller_id"]}:
                return error("Order not found.", 404)
            cursor.execute("SELECT * FROM HandoverRecords WHERE order_id=%s ORDER BY handover_id", (order_id,))
            rows = cursor.fetchall()
        return jsonify({"handovers": rows})

    @app.post("/api/uploads/images")
    @authenticated
    def upload_image():
        uploaded = request.files.get("image")
        if uploaded is None:
            return error("Select an image file.")
        ext = Path(uploaded.filename or "").suffix.lower()
        signatures = {
            ".jpg": (b"\xff\xd8\xff",),
            ".jpeg": (b"\xff\xd8\xff",),
            ".png": (b"\x89PNG\r\n\x1a\n",),
            ".gif": (b"GIF87a", b"GIF89a"),
            ".webp": (b"RIFF",),
        }
        prefix = uploaded.stream.read(12)
        uploaded.stream.seek(0)
        valid_signature = ext in signatures and any(prefix.startswith(signature) for signature in signatures[ext])
        if ext == ".webp":
            valid_signature = prefix.startswith(b"RIFF") and prefix[8:12] == b"WEBP"
        if not valid_signature:
            return error("Upload a valid JPEG, PNG, GIF, or WebP image.")
        folder = Path(app.config["UPLOAD_FOLDER"]).resolve()
        folder.mkdir(parents=True, exist_ok=True)
        filename = f"{uuid.uuid4().hex}{ext}"
        uploaded.save(folder / filename)
        return jsonify({"url": f"/api/uploads/{filename}"}), 201

    @app.get("/api/uploads/<path:filename>")
    def serve_upload(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    return app


def error(message, status=400):
    return jsonify({"error": message}), status


def body():
    return request.get_json(silent=True) or {}


def clean_text(value, max_length):
    return value.strip()[:max_length] if isinstance(value, str) else ""


def authenticated(function):
    @wraps(function)
    def wrapped(*args, **kwargs):
        user_id = session.get("user_id")
        if not user_id:
            return error("Authentication required.", 401)
        user = get_user(user_id)
        if not user or user["account_status"] != "active":
            session.clear()
            return error("Authentication required.", 401)
        g.user = user
        return function(*args, **kwargs)
    return wrapped


def get_user(user_id):
    with get_db().cursor() as cursor:
        cursor.execute("SELECT * FROM Users WHERE user_id=%s", (user_id,))
        return cursor.fetchone()


def user_payload(user):
    return {
        "id": user["user_id"],
        "name": user["full_name"],
        "email": user["college_email"],
        "department": user["department"],
        "year": user["college_year"],
        "avatar": user["profile_image_url"],
        "joinedAt": user["created_at"].isoformat() if user["created_at"] else None,
        "role": user["role"],
    }


def listing_select():
    return (
        "SELECT l.listing_id,l.seller_id,l.category_id,l.title,l.description,l.listing_type,l.price,"
        "l.item_condition,l.borrow_duration,l.quantity,l.status,l.created_at,c.category_name,u.full_name,u.department,"
        "u.college_year,(SELECT GROUP_CONCAT(image_url ORDER BY is_primary DESC,image_id SEPARATOR '\\n') "
        "FROM ListingImages WHERE listing_id=l.listing_id) AS image_urls,"
        "(SELECT COUNT(*) FROM Orders o JOIN OrderItems oi ON oi.order_id=o.order_id "
        "WHERE oi.listing_id=l.listing_id) AS request_count "
        "FROM Listings l JOIN Users u ON u.user_id=l.seller_id "
        "JOIN Categories c ON c.category_id=l.category_id"
    )


def listing_payload(row):
    image_urls = row.get("image_urls")
    images = [value for value in image_urls.split("\n") if value] if image_urls else []
    return {
        "id": row["listing_id"],
        "title": row["title"],
        "description": row["description"],
        "category": slug(row["category_name"]),
        "categoryLabel": row["category_name"],
        "type": row["listing_type"],
        "condition": row["item_condition"].lower().replace(" ", "-"),
        "conditionLabel": row["item_condition"],
        "price": float(row["price"]) if row["price"] is not None else None,
        "borrowDuration": row["borrow_duration"],
        "quantity": row["quantity"],
        "images": images or ["/listing-placeholder.svg"],
        "available": row["status"] == "available" and row["quantity"] > 0,
        "createdAt": row["created_at"].isoformat() if row["created_at"] else None,
        "requests": row.get("request_count", 0),
        "views": 0,
        "seller": {
            "id": row["seller_id"],
            "name": row["full_name"],
            "department": row["department"],
            "year": row["college_year"],
            "avatar": None,
        },
    }


def slug(value):
    normalized = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return {"sports-fitness": "sports", "cycles-transport": "cycles"}.get(normalized, normalized)


def category_db_slug(value):
    return {"sports": "sports-fitness", "cycles": "cycles-transport"}.get(value, value)


def get_listing_row(listing_id):
    with get_db().cursor() as cursor:
        cursor.execute(listing_select() + " WHERE l.listing_id=%s", (listing_id,))
        return cursor.fetchone()


def get_listing(listing_id):
    row = get_listing_row(listing_id)
    return listing_payload(row) if row else None


def validate_listing(data, partial=False, current=None):
    source = {**(current or {}), **data}
    title = clean_text(source.get("title"), 180)
    description = clean_text(source.get("description"), 5000)
    listing_type = source.get("type", source.get("listing_type"))
    condition_input = source.get("condition", source.get("item_condition", ""))
    condition = CONDITION_VALUES.get(str(condition_input).replace("-", " ").lower(), condition_input)
    category = source.get("category")
    if not category and "category_name" in source:
        category = slug(source["category_name"])
    if not partial and (not title or not description or listing_type not in LISTING_TYPES or not condition or not category):
        return None, "Provide a title, description, valid listing type, condition, and category."
    if title and listing_type not in LISTING_TYPES:
        return None, "Listing type must be sale, borrow, or free."
    if condition and condition not in CONDITION_VALUES.values():
        return None, "Select a valid item condition."
    try:
        quantity = int(source.get("quantity", 1))
        if quantity < 1:
            raise ValueError
    except (TypeError, ValueError):
        return None, "Quantity must be a positive integer."
    price = source.get("price")
    if listing_type == "sale":
        try:
            price = float(price)
            if price < 0:
                raise ValueError
        except (TypeError, ValueError):
            return None, "Sale listings require a non-negative price."
    else:
        price = None
    borrow_duration = clean_text(source.get("borrowDuration") or source.get("borrow_duration"), 80) or None
    if listing_type == "borrow" and not borrow_duration:
        return None, "Borrow listings must specify a borrow duration."
    if listing_type != "borrow":
        borrow_duration = None
    if not partial and not category:
        return None, "Select a valid category."
    images = source.get("images", [])
    if not isinstance(images, list) or len(images) > 4 or any(not isinstance(item, str) or len(item) > 500 for item in images):
        return None, "Provide up to four valid image URLs."
    return {
        "title": title,
        "description": description,
        "listing_type": listing_type,
        "condition": condition,
        "price": price,
        "borrow_duration": borrow_duration,
        "quantity": quantity,
        "category": str(category or "").lower(),
        "images": images,
    }, None


def page_args():
    try:
        page = max(1, int(request.args.get("page", "1")))
        per_page = min(50, max(1, int(request.args.get("per_page", "24"))))
    except ValueError:
        return 1, 24
    return page, per_page


def parse_date(value):
    try:
        return date.fromisoformat(value) if value else None
    except (TypeError, ValueError):
        return None


def create_notification(cursor, user_id, order_id, kind, message):
    cursor.execute(
        "INSERT INTO Notifications (user_id,order_id,notification_type,message) VALUES (%s,%s,%s,%s)",
        (user_id, order_id, kind, message),
    )


def order_select():
    return (
        "SELECT o.order_id,o.buyer_id,o.seller_id,o.transaction_type,o.status,o.order_date,"
        "o.expected_return_date,o.actual_return_date,o.buyer_note,o.completed_at,"
        "oi.listing_id,oi.quantity,oi.unit_price,l.title AS listing_title,l.listing_type,"
        "buyer.full_name AS buyer_name,buyer.department AS buyer_department,"
        "seller.full_name AS seller_name "
        "FROM Orders o JOIN OrderItems oi ON oi.order_id=o.order_id "
        "JOIN Listings l ON l.listing_id=oi.listing_id "
        "JOIN Users buyer ON buyer.user_id=o.buyer_id JOIN Users seller ON seller.user_id=o.seller_id"
    )


def order_payload(row):
    return {
        "id": row["order_id"],
        "listingId": row["listing_id"],
        "listingTitle": row["listing_title"],
        "type": row["listing_type"],
        "transactionType": row["transaction_type"],
        "requesterId": row["buyer_id"],
        "requesterName": row["buyer_name"],
        "requesterDept": row["buyer_department"],
        "sellerId": row["seller_id"],
        "sellerName": row["seller_name"],
        "status": row["status"],
        "message": row["buyer_note"] or "",
        "createdAt": row["order_date"].isoformat() if row["order_date"] else None,
        "expectedReturnDate": row["expected_return_date"].isoformat() if row["expected_return_date"] else None,
        "actualReturnDate": row["actual_return_date"].isoformat() if row["actual_return_date"] else None,
        "quantity": row["quantity"],
    }


def get_order(order_id, user_id):
    with get_db().cursor() as cursor:
        cursor.execute(order_select() + " WHERE o.order_id=%s AND (o.buyer_id=%s OR o.seller_id=%s)", (order_id, user_id, user_id))
        row = cursor.fetchone()
    return order_payload(row) if row else None


def order_list(where, params):
    with get_db().cursor() as cursor:
        cursor.execute(order_select() + " WHERE (" + where + ") ORDER BY o.order_date DESC", params)
        rows = cursor.fetchall()
    return jsonify({"orders": [order_payload(row) for row in rows]})


app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")), debug=os.getenv("FLASK_DEBUG", "false").lower() == "true")
