# Database migrations

This project uses schema-only migrations for the relational database layer. These migration files are intentionally empty-data: they create the expected tables and constraints needed by the backend runtime, but do not insert demo records.

Use the migration runner in the backend environment when ready:

- `alembic upgrade head`

This repository currently uses a schema-first integration approach; no seed files or fixture data are included.
