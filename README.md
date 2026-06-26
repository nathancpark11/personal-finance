# Personal Finance Dashboard

iPhone-first personal finance dashboard built with Next.js App Router, TypeScript, Tailwind CSS, Neon Postgres, and Drizzle ORM.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Neon Postgres
- Drizzle ORM
- Route handlers for server-side mutations

## Database Setup

1. Create a Neon project
2. Copy the pooled Postgres connection string
3. Add it to local environment variables

Create .env.local:

```bash
DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require
```

## Install Dependencies

```bash
npm install
```

## Run Migrations

Generate migration SQL from schema:

```bash
npm run db:generate
```

Apply migrations to Neon:

```bash
npm run db:migrate
```

Optional development shortcut:

```bash
npm run db:push
```

Seed default household, users, and starter monthly expense rows:

```bash
npm run db:seed
```

## Run Locally

```bash
npm run dev
```

Open http://localhost:3000.

## Production Checks

```bash
npm run lint
npm run build
```

## Deploy to Vercel

1. Push repository to GitHub
2. Import project in Vercel
3. Add DATABASE_URL in project Settings > Environment Variables
4. Deploy

Important:

- Do not expose DATABASE_URL to the browser
- All writes run server-side in route handlers under app/api
- Keep .env.local out of source control

## Data Model

Tables:

- households
- users
- income
- monthly_expenses
- daily_expenses

Defaults:

- Rent
- Tithe
- Savings
- Car Insurance

## Shared Data Behavior

- Both phones read and write the same household rows in Neon
- New expenses show on both devices after refresh
- Remaining to Spend is recalculated as:

```text
income - monthly_expenses_total - daily_expenses_total
```
