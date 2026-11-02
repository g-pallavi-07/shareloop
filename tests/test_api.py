import unittest
from unittest.mock import patch

from backend.app import create_app, purchase_fully_confirmed, send_otp_email, slug, validate_listing


class ApiTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app({"TESTING": True, "SECRET_KEY": "test-secret"})
        self.client = self.app.test_client()

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
            patch("backend.app.send_otp_email") as send_email,
        ):
            response = self.client.post(
                "/api/auth/send-otp",
                json={"email": "student@nsut.ac.in"},
            )

        self.assertEqual(response.status_code, 200)
        code = send_email.call_args.args[1]
        self.assertRegex(code, r"^\d{6}$")
        self.assertEqual(send_email.call_args.args[0], "student@nsut.ac.in")

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
            patch("backend.app.send_otp_email", side_effect=ValueError("SMTP not configured")),
        ):
            response = self.client.post(
                "/api/auth/send-otp",
                json={"email": "student@nsut.ac.in"},
            )

        self.assertEqual(response.status_code, 503)
        self.assertIn("Email verification", response.get_json()["error"])

    def test_otp_email_uses_configured_smtp_with_tls(self):
        class SmtpServer:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def ehlo(self):
                pass

            def starttls(self, context):
                self.tls_context = context

            def login(self, _username, _password):
                pass

            def send_message(self, message):
                self.message = message

        with (
            patch.dict(
                "os.environ",
                {"MAIL_USERNAME": "sender@example.com", "MAIL_PASSWORD": "test-password"},
            ),
            patch("backend.app.smtplib.SMTP", return_value=SmtpServer()) as smtp,
        ):
            send_otp_email("student@nsut.ac.in", "123456")

        smtp.assert_called_once_with("smtp.gmail.com", 587, timeout=20)

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
        borrow = {**valid_sale, "type": "borrow", "price": None}
        self.assertIsNotNone(validate_listing(borrow)[1])
        self.assertIsNone(validate_listing({**borrow, "borrowDuration": "2 weeks"})[1])

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
