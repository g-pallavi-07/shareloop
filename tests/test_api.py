import unittest

from backend.app import create_app, slug, validate_listing


class ApiTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app({"TESTING": True, "SECRET_KEY": "test-secret"})
        self.client = self.app.test_client()

    def test_health_endpoint_does_not_claim_database_was_checked(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["database"], "not_checked")

    def test_private_routes_reject_anonymous_users(self):
        for path in ("/api/auth/me", "/api/listings/mine", "/api/favorites", "/api/orders"):
            with self.subTest(path=path):
                response = self.client.get(path)
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


if __name__ == "__main__":
    unittest.main()
