# Database setup

Run these scripts in order using MySQL Workbench or the MySQL command-line client:

1. `schema.sql` creates `shareloop_db` and its InnoDB tables.
2. `sample_data.sql` inserts fictional demo users, listings, and related records.
3. `views.sql` creates the listing and seller-rating summary views.
4. `queries.sql` contains DBMS demonstration queries.
5. `triggers.sql` documents why no triggers are needed; transaction rules are enforced by Flask.

The demo account password for all seeded users is `ShareLoopDemo!23`. Demo identities and credentials are for local evaluation only.
