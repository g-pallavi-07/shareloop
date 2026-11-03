import unittest
from datetime import datetime
from unittest.mock import patch

from backend.app import create_app, purchase_fully_confirmed, slug, validate_listing


class FakeCursor:
    def __init__(self, database):
        self.database = database
        self.result = None
        self.results = []

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, query, params=()):
        if "SELECT buyer_id,seller_id,status FROM Orders" in query:
            self.result = self.database.order
        elif query.startswith("INSERT INTO Reviews"):
            order_id, reviewer_id, reviewee_id, rating, comment = params
            if any(row["order_id"] == order_id and row["reviewer_id"] == reviewer_id
                   for row in self.database.reviews):
                from pymysql.err import IntegrityError
                raise IntegrityError(1062, "duplicate review")
            self.database.reviews.append({
                "order_id": order_id,
                "reviewer_id": reviewer_id,
                "reviewee_id": reviewee_id,
                "rating": rating,
                "comment": comment,
                "created_at": datetime(2026, 1, 2),
                "reviewer_name": "Reviewer",
                "reviewer_department": "Science",
                "reviewer_year": "2nd Year",
            })
        elif "SELECT 1 FROM Users" in query:
            self.result = {"user_id": params[0]}
        elif "SELECT user_id FROM Users WHERE user_id=" in query:
            self.result = {"user_id": params[0]}
        elif "SELECT r.order_id,r.rating" in query:
            self.results = [row for row in self.database.reviews if row["reviewee_id"] == params[0]]
        elif "SELECT AVG(rating)" in query:
            rows = [row for row in self.database.reviews if row["reviewee_id"] == params[0]]
            self.result = {
                "average_rating": sum(row["rating"] for row in rows) / len(rows) if rows else None,
                "review_count": len(rows),
            }
        elif "SELECT seller_id FROM Listings" in query:
            self.result = {"seller_id": self.database.listing_seller}
        elif query.startswith("INSERT INTO Reports"):
            self.database.reports.append(params)
            self.database.report_exists = True
        elif "SELECT report_id FROM Reports" in query:
            self.result = {"report_id": params[0]} if self.database.report_exists else None
        elif query.startswith("UPDATE Reports SET"):
            self.database.report_status = params[0]
            self.rowcount = 1
        elif query.startswith("UPDATE Users SET account_status"):
            self.database.user_status = params[0]
            self.rowcount = 1
        elif "FROM Reports r JOIN Users reporter" in query:
            self.results = []

    def fetchone(self):
        return self.result

    def fetchall(self):
        return self.results


class FakeDatabase:
    def __init__(self):
        self.order = {"buyer_id": 1, "seller_id": 2, "status": "completed"}
        self.listing_seller = 2
        self.reviews = []
        self.reports = []
        self.commits = 0
        self.rollbacks = 0
        self.report_exists = True
        self.report_status = "open"
        self.user_status = "active"

    def cursor(self):
        return FakeCursor(self)

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1


class BorrowReturnCursor:
    def __init__(self, database):
        self.database = database
        self.result = None

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, query, params=()):
        if query.startswith("SELECT o.*, oi.listing_id"):
            self.result = self.database.order
        elif query.startswith("UPDATE Orders SET borrower_return_confirmed_at"):
            self.database.order["borrower_return_confirmed_at"] = datetime.now()
            self.database.order["actual_return_date"] = params[0]
        elif query.startswith("UPDATE Orders SET seller_return_payment_confirmed_at"):
            self.database.order["seller_return_payment_confirmed_at"] = datetime.now()
            self.database.order["status"] = "completed"
        elif query.startswith("UPDATE Listings SET quantity=quantity+"):
            self.database.restored_quantity += params[0]

    def fetchone(self):
        return self.result


class BorrowReturnDatabase:
    def __init__(self):
        self.order = {
            "order_id": 7,
            "buyer_id": 1,
            "seller_id": 2,
            "transaction_type": "borrow",
            "status": "accepted",
            "listing_id": 12,
            "quantity": 1,
            "borrower_return_confirmed_at": None,
            "seller_return_payment_confirmed_at": None,
        }
        self.restored_quantity = 0

    def cursor(self):
        return BorrowReturnCursor(self)

    def commit(self):
        pass

    def rollback(self):
        pass


class ApiTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app({"TESTING": True, "SECRET_KEY": "test-secret"})
        self.client = self.app.test_client()

    def authenticate(self, user_id=1, role="student"):
        with self.client.session_transaction() as flask_session:
            flask_session["user_id"] = user_id
        return patch(
            "backend.app.get_user",
            return_value={
                "user_id": user_id,
                "role": role,
                "account_status": "active",
            },
        )

    def test_health_endpoint_does_not_claim_database_was_checked(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["database"], "not_checked")

    def test_private_routes_reject_anonymous_users(self):
        for path in (
            "/api/auth/me",
            "/api/listings/mine",
            "/api/favorites",
            "/api/orders",
        ):
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 401)

    def test_purchase_confirmation_rejects_anonymous_users(self):
        response = self.client.patch("/api/orders/1/confirm")
        self.assertEqual(response.status_code, 401)

    def test_borrow_return_requires_borrower_then_seller_confirmation(self):
        database = BorrowReturnDatabase()

        with (
            self.authenticate(user_id=2),
            patch("backend.app.get_db", return_value=database),
            patch("backend.app.create_notification", return_value=None),
            patch("backend.app.get_order", side_effect=lambda *_: {"status": database.order["status"]}),
        ):
            early_seller_confirmation = self.client.patch("/api/orders/7/return-received")
            self.assertEqual(early_seller_confirmation.status_code, 409)

        with (
            self.authenticate(user_id=1),
            patch("backend.app.get_db", return_value=database),
            patch("backend.app.create_notification", return_value=None),
            patch("backend.app.get_order", side_effect=lambda *_: {"status": database.order["status"]}),
        ):
            borrower_confirmation = self.client.patch("/api/orders/7/return")
            self.assertEqual(borrower_confirmation.status_code, 200)
            self.assertEqual(database.order["status"], "accepted")
            self.assertEqual(database.restored_quantity, 0)

        with (
            self.authenticate(user_id=2),
            patch("backend.app.get_db", return_value=database),
            patch("backend.app.create_notification", return_value=None),
            patch("backend.app.get_order", side_effect=lambda *_: {"status": database.order["status"]}),
        ):
            seller_confirmation = self.client.patch("/api/orders/7/return-received")
            self.assertEqual(seller_confirmation.status_code, 200)

        self.assertEqual(database.order["status"], "completed")
        self.assertEqual(database.restored_quantity, 1)

    def test_reviews_and_reports_reject_anonymous_users(self):
        self.assertEqual(self.client.post("/api/reviews", json={}).status_code, 401)
        self.assertEqual(self.client.post("/api/reports", json={}).status_code, 401)
        self.assertEqual(self.client.get("/api/reports").status_code, 401)

    def test_review_submission_requires_completed_order_and_participation(self):
        database = FakeDatabase()
        with self.authenticate(), patch("backend.app.get_db", return_value=database):
            response = self.client.post("/api/reviews", json={"order_id": 2, "rating": 5})
            self.assertEqual(response.status_code, 201)
            self.assertEqual(database.reviews[0]["reviewee_id"], 2)

            duplicate = self.client.post("/api/reviews", json={"order_id": 2, "rating": 4})
            self.assertEqual(duplicate.status_code, 409)

            database.order["status"] = "accepted"
            incomplete = self.client.post("/api/reviews", json={"order_id": 2, "rating": 5})
            self.assertEqual(incomplete.status_code, 403)

        with self.authenticate(user_id=3), patch("backend.app.get_db", return_value=database):
            nonparticipant = self.client.post("/api/reviews", json={"order_id": 2, "rating": 5})
            self.assertEqual(nonparticipant.status_code, 403)

    def test_profile_reviews_return_reviewer_and_live_rating_summary(self):
        database = FakeDatabase()
        database.reviews.append({
            "order_id": 2,
            "reviewer_id": 1,
            "reviewee_id": 2,
            "rating": 4,
            "comment": "Smooth exchange",
            "created_at": datetime(2026, 1, 2),
            "reviewer_name": "Reviewer",
            "reviewer_department": "Science",
            "reviewer_year": "2nd Year",
        })
        with patch("backend.app.get_db", return_value=database):
            response = self.client.get("/api/users/2/reviews")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["average_rating"], 4)
        self.assertEqual(response.get_json()["review_count"], 1)
        self.assertEqual(response.get_json()["reviews"][0]["reviewer_name"], "Reviewer")

    def test_report_submission_requires_one_target_and_blocks_own_listing(self):
        database = FakeDatabase()
        database.listing_seller = 1
        with self.authenticate(), patch("backend.app.get_db", return_value=database):
            no_target = self.client.post("/api/reports", json={"reason": "other"})
            both_targets = self.client.post("/api/reports", json={
                "listing_id": 10, "reported_user_id": 2, "reason": "other",
            })
            self.assertEqual(no_target.status_code, 400)
            self.assertEqual(both_targets.status_code, 400)

            self_report = self.client.post("/api/reports", json={
                "listing_id": 10, "reason": "scam_fraud",
            })
            self.assertEqual(self_report.status_code, 403)
            self.assertEqual(database.reports, [])

            database.listing_seller = 2
            report = self.client.post("/api/reports", json={
                "listing_id": 10, "reason": "scam_fraud", "details": "Suspicious offer",
            })
            self.assertEqual(report.status_code, 201)
            self.assertEqual(database.reports[0][1:3], (10, None))

    def test_user_reports_and_admin_moderation_use_protected_endpoints(self):
        database = FakeDatabase()
        with self.authenticate(), patch("backend.app.get_db", return_value=database):
            self_report = self.client.post("/api/reports", json={
                "reported_user_id": 1, "reason": "suspicious_behavior",
            })
            report = self.client.post("/api/reports", json={
                "reported_user_id": 2, "reason": "suspicious_behavior",
            })
        self.assertEqual(self_report.status_code, 403)
        self.assertEqual(report.status_code, 201)
        self.assertEqual(database.reports[0][1:3], (None, 2))

        with self.authenticate(user_id=10, role="admin"), patch("backend.app.get_db", return_value=database):
            queue = self.client.get("/api/reports")
            status = self.client.patch("/api/reports/1", json={"status": "reviewing"})
            account = self.client.patch("/api/admin/users/2/status", json={"status": "suspended"})
        self.assertEqual(queue.status_code, 200)
        self.assertEqual(status.status_code, 200)
        self.assertEqual(account.status_code, 200)
        self.assertEqual(database.report_status, "reviewing")
        self.assertEqual(database.user_status, "suspended")

    def test_student_cannot_access_admin_report_or_account_management(self):
        with self.authenticate(role="student"):
            report_list = self.client.get("/api/reports")
            suspend = self.client.patch("/api/admin/users/2/status", json={"status": "suspended"})
        self.assertEqual(report_list.status_code, 403)
        self.assertEqual(suspend.status_code, 403)

    def test_login_requires_credentials_before_database_access(self):
        response = self.client.post("/api/auth/login", json={})
        self.assertEqual(response.status_code, 400)

    def test_registration_rejects_malformed_email_before_database_access(self):
        response = self.client.post(
            "/api/auth/register",
            json={
                "full_name": "Demo Student",
                "college_email": "not-an-email",
                "department": "Computer Science",
                "college_year": "2nd Year",
                "password": "ShareLoopDemo!23",
            },
        )
        self.assertEqual(response.status_code, 400)

    def test_send_otp_saves_and_sends_a_six_digit_code(self):
        class Cursor:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def execute(self, query, _params):
                self.query = query

            def fetchone(self):
                return None

        class Database:
            def cursor(self):
                return Cursor()

            def commit(self):
                pass

            def rollback(self):
                pass

        with (
            patch("backend.app.get_db", return_value=Database()),
            patch.dict("os.environ", {"OTP_MAILER_URL": "https://mailer.example", "OTP_MAILER_SECRET": "test-secret"}),
            patch("backend.app.requests.post") as send_email,
        ):
            send_email.return_value.raise_for_status.return_value = None
            send_email.return_value.json.return_value = {"ok": True}
            response = self.client.post(
                "/api/auth/send-otp",
                json={"email": "student@nsut.ac.in"},
            )

        self.assertEqual(response.status_code, 200)
        code = send_email.call_args.kwargs["json"]["otp"]
        self.assertRegex(code, r"^\d{6}$")
        self.assertEqual(send_email.call_args.args[0], "https://mailer.example")

    def test_send_otp_reports_missing_email_configuration(self):
        class Cursor:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def execute(self, _query, _params):
                pass

            def fetchone(self):
                return None

        class Database:
            def cursor(self):
                return Cursor()

            def commit(self):
                pass

            def rollback(self):
                pass

        with (
            patch("backend.app.get_db", return_value=Database()),
            patch.dict("os.environ", {"OTP_MAILER_URL": "", "OTP_MAILER_SECRET": ""}),
        ):
            response = self.client.post(
                "/api/auth/send-otp",
                json={"email": "student@nsut.ac.in"},
            )

        self.assertEqual(response.status_code, 500)
        self.assertIn("verification email", response.get_json()["error"])

    def test_sort_parameter_is_whitelisted(self):
        response = self.client.get("/api/listings?sort=created_at%3BDROP%20TABLE%20Users")
        self.assertEqual(response.status_code, 400)

    def test_listing_validation_enforces_type_price_and_borrow_duration(self):
        valid_sale = {
            "title": "Calculator",
            "description": "Works well",
            "type": "sale",
            "category": "tech-gadgets",
            "condition": "Like New",
            "price": 0,
            "quantity": 1,
        }
        values, issue = validate_listing(valid_sale)
        self.assertIsNone(issue)
        self.assertEqual(values["price"], 0)
        self.assertIsNotNone(validate_listing({**valid_sale, "price": -1})[1])
        borrow = {**valid_sale, "type": "borrow", "price": 25, "borrowDuration": "2 weeks"}
        values, issue = validate_listing(borrow)
        self.assertIsNone(issue)
        self.assertEqual(values["price"], 25)
        self.assertIsNotNone(validate_listing({**borrow, "price": None})[1])
        self.assertIsNotNone(validate_listing({**borrow, "price": -1})[1])
        legacy_current = {"listing_type": "borrow", "price": None, "borrow_duration": "2 weeks"}
        values, issue = validate_listing({"status": "unavailable"}, partial=True, current=legacy_current)
        self.assertIsNone(issue)
        self.assertIsNone(values["price"])

    def test_category_slugs_match_existing_frontend_filters(self):
        self.assertEqual(slug("Sports & Fitness"), "sports")
        self.assertEqual(slug("Cycles & Transport"), "cycles")

    def test_purchase_completion_requires_both_parties_and_payment_when_needed(self):
        order = {
            "buyer_id": 1,
            "seller_id": 2,
            "buyer_handover_confirmed_at": None,
            "seller_handover_confirmed_at": None,
            "buyer_payment_confirmed_at": None,
            "seller_payment_confirmed_at": None,
        }
        self.assertFalse(purchase_fully_confirmed(order, True, 1))
        order["buyer_handover_confirmed_at"] = object()
        order["buyer_payment_confirmed_at"] = object()
        self.assertFalse(purchase_fully_confirmed(order, True, 1))
        order["seller_handover_confirmed_at"] = object()
        self.assertTrue(purchase_fully_confirmed(order, True, 2))
        self.assertTrue(purchase_fully_confirmed(order, False, 1))


if __name__ == "__main__":
    unittest.main()
