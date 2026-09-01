# CashArrow persistence

CashArrow uses PostgreSQL on Render when `DATABASE_URL` is configured. SQLite remains the local synchronous compatibility layer for the existing route code, while PostgreSQL is restored into that layer at startup and synchronized after writes.

The server waits for the database initialization before accepting requests so a request cannot read the temporary empty SQLite database during startup.
