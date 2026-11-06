# Savdo Panel

A POS / inventory / finance / installment-credit management app for a single retail store, built as an original, better-designed alternative to elektron-savdo.uz — same feature set, own design and code.

## Features

- **Kassa** — search-first POS, barcode/SKU search, cash / card / credit / mixed checkout, live stock decrement
- **Ombor** — inventory CRUD, stock levels, low-stock / out-of-stock badges
- **Mijozlar** — customer records, purchase history, outstanding credit per customer
- **Moliya** — cash/card ledger, manual income/expense entries, period filters
- **Nasiya** — installment credit tracking, overdue/upcoming/paid grouping, partial payments
- **Xodimlar** — staff records and daily attendance
- **Kategoriyalar** — product categories
- **Do'kon** — public storefront (no login) where customers browse and place orders
- **Sozlamalar** — store settings, password change
- Online orders placed on the storefront show up live in the admin Kassa page, with an optional Telegram notification
- Installable as a PWA (manifest included)

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Prisma · PostgreSQL

## Setup

1. **Database** — needs a local PostgreSQL. If you have Homebrew's `postgresql@18` (as this dev environment does):
   ```bash
   brew services start postgresql@18
   psql postgres -c "CREATE USER savdo WITH PASSWORD 'savdo' SUPERUSER;"
   psql postgres -c "CREATE DATABASE savdo OWNER savdo;"
   ```
   Or use the included `docker-compose.yml` instead: `docker compose up -d`.

2. **Env vars** — `.env` is already set up for the local DB above. Optionally add Telegram notifications:
   ```
   TELEGRAM_BOT_TOKEN=...   # from @BotFather
   TELEGRAM_CHAT_ID=...     # chat/group to notify on new online orders
   ```

3. **Install & migrate**:
   ```bash
   npm install
   npx prisma migrate dev
   npm run db:seed
   ```

4. **Run**:
   ```bash
   npm run dev
   ```
   Admin: http://localhost:3000/admin — login `demo` / `demo1234`
   Public storefront: http://localhost:3000/do-kon

## Notes

- Single-store for now — the `Store` model supports multiple stores in schema, but there's no store-signup flow; everything in this build assumes the first `Store` row.
- `next.config.ts` disables Next 16's new Cache Components mode, since this app needs live per-request data (stock, sales, credit balances) rather than static caching.
