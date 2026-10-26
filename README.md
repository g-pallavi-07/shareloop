# ShareLoop

ShareLoop is a campus marketplace for students to buy, borrow, give away, and request items. The existing React/Vite interface now uses a Flask API and MySQL for accounts, listings, favorites, and transaction requests.

## Prerequisites

- Node.js 20.19+ (or 22.12+) and npm.
- Python 3.10+.
- MySQL Server 8.0+ and MySQL Workbench (or the MySQL command-line client).

## Database setup

1. Start MySQL Server and connect with an account allowed to create databases/users.
2. Open and execute `database\schema.sql` in MySQL Workbench.
3. Execute `database\sample_data.sql`, `database\views.sql`, and optionally `database\queries.sql`.
4. Create a least-privileged application account after the database exists, using a unique password:
   ```sql
   CREATE USER 'shareloop'@'127.0.0.1' IDENTIFIED BY 'replace-with-a-unique-password';
   GRANT SELECT, INSERT, UPDATE, DELETE ON shareloop_db.* TO 'shareloop'@'127.0.0.1';
   FLUSH PRIVILEGES;
   ```
   Put that account in `DB_USER` and `DB_PASSWORD` in `backend\.env`.
5. A development account can be used for local testing:
   - Email: `aarav.mehta@college.edu`
   - Password: `ShareLoopDemo!23`
   - Seeded admin: `admin@college.edu` (same demo password)
5. The sample data and password are fictional and intended for local evaluation only.

The `database\queries.sql` file demonstrates joins, aggregates, grouping, `HAVING`, nested/correlated queries, and transaction summaries. There are no triggers because the application enforces state changes in explicit transactions.

## Backend setup

From PowerShell:

```powershell
Set-Location backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend\.env` and set a unique `SECRET_KEY`, MySQL connection settings, and the Vite frontend origin. Set `COLLEGE_EMAIL_DOMAINS` to a comma-separated list only if the campus requires particular email domains; leave it empty to accept any syntactically valid email address.

Start the backend from the `backend` directory:

```powershell
python app.py
```

It listens on `http://localhost:5000`. `GET /api/health` confirms the process is responding; it deliberately says `database: not_checked` because the health probe does not open a database connection.

For a production deployment, configure a strong secret, HTTPS, `COOKIE_SECURE=true`, a narrowly-scoped `FRONTEND_ORIGIN`, and persistent external image storage. The included file upload directory is suitable for local development only.

## Frontend setup

In a second terminal, at the repository root:

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Open the Vite URL printed by the command (normally `http://localhost:5173`). `VITE_API_BASE_URL` defaults to `http://localhost:5000/api`.

The browser uses an HTTP-only, signed Flask session cookie rather than putting a long-lived bearer token in web storage. The current user's non-secret display profile is held in `sessionStorage`; logout clears both the cookie and that UI state.

## API route reference

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register a student account |
| POST | `/api/auth/login` | Start a session |
| POST | `/api/auth/logout` | End the current session |
| GET | `/api/auth/me` | Read the current account |
| PATCH | `/api/users/me` | Update profile fields |
| POST | `/api/users/change-password` | Change password |
| GET | `/api/categories` | List active categories |
| GET | `/api/listings` | Search/filter/sort/paginate available listings |
| GET | `/api/listings/featured` | Most recently added available listings |
| GET | `/api/listings/mine` | Current user's listings |
| GET | `/api/listings/<id>` | Listing details |
| POST/PATCH/DELETE | `/api/listings[/<id>]` | Create, edit, or soft-remove a listing |
| GET | `/api/favorites` | Current user's saved listings |
| POST/DELETE | `/api/favorites/<listing_id>` | Add or remove a favorite |
| POST | `/api/orders` | Request a purchase, free item, or borrow |
| GET | `/api/orders`, `/incoming`, `/outgoing` | Participant-scoped order lists |
| PATCH | `/api/orders/<id>/<accept\|reject\|cancel\|complete\|return>` | Apply a permitted transaction transition |
| POST | `/api/reviews` | Review a completed transaction |
| POST | `/api/reports` | Report one listing or user |
| GET/PATCH | `/api/reports` | Admin-only report queue and status updates |
| GET/PATCH | `/api/notifications` | Read own notifications |
| POST/PATCH/GET | `/api/handover...` | Create/confirm participant-only handovers |
| POST | `/api/uploads/images` | Upload a JPEG, PNG, GIF, or WebP image (5 MB max) |

Listing search parameters include `q`, `category`, `type`, `minPrice`, `maxPrice`, `condition`, `sort`, `page`, and `per_page`. Sort values are restricted to `newest`, `price-asc`, and `price-desc`.

## Transaction policy

Pending requests do not reserve inventory. The seller's acceptance endpoint locks the listing row and checks inventory in a database transaction before decrementing stock, so concurrently accepted requests cannot oversell it. A purchase is completed by an authorized participant after acceptance. Borrowed inventory is returned with the separate `return` action, which records the actual return date and restores quantity. Borrow requests must include a future expected return date.

The API stores payment records only as demonstration data; it does not process real payments. Listing images are stored as generated-name files outside the source tree and referenced by URL in MySQL.

## Tests and verification

Run the backend's isolated input/authorization tests from the repository root:

```powershell
python -m unittest discover -s tests -v
```

Run frontend checks:

```powershell
npm run lint
npm run build
```

The automated tests cover input validation and unauthenticated access without connecting to a real database. Database import, SQL integration, transaction concurrency, and browser end-to-end behavior must be checked on a machine with MySQL 8 and a configured `.env`; they have not been claimed as verified in an environment without a MySQL server.

## Troubleshooting

- **Can't connect to MySQL:** Confirm the server is running, the schema was imported, and `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in `backend\.env` match it.
- **CORS or login appears to reset:** Use the Vite URL specified by `FRONTEND_ORIGIN`, and keep frontend/backend on `localhost` (do not mix `localhost` and `127.0.0.1`). Requests include credentials for the HTTP-only session cookie.
- **Demo login fails:** Re-run `database\sample_data.sql`; use `aarav.mehta@college.edu` and `ShareLoopDemo!23`.
- **Image upload fails:** Use JPEG/PNG/GIF/WebP files under 5 MB and ensure the configured upload directory is writable.
