# Subscription Tracker

A Cloudflare Worker + D1 database that tracks your monthly and yearly subscription spending.

## Features

- Add subscriptions with name, amount, currency, cycle, category, and next billing date
- See monthly and yearly totals in real time
- Anonymous ID generated in browser — no account, no email
- Data stored in Cloudflare D1
- Multi-language interface (EN + ZH)

## Architecture

- **Worker** (`src/index.js`) handles `/api/subscriptions` CRUD
- **D1** stores subscriptions keyed by anonymous user_id
- **Static assets** (`public/`) contain the UI
- **run_worker_first** ensures API routes bypass static file matching

## First-time setup

1. **Create the D1 database**

   ```bash
   npx wrangler d1 create subscription-tracker-db
   ```

   Copy the `database_id` from the output and replace `PLACEHOLDER_DATABASE_ID` in `wrangler.toml`.

2. **Apply the schema**

   ```bash
   npx wrangler d1 execute subscription-tracker-db --file=./schema.sql --remote
   ```

3. **Deploy**

   ```bash
   npm install
   npx wrangler login
   npx wrangler deploy
   ```

## Local development

```bash
npx wrangler dev
```

For local D1 testing, apply the schema with `--local`:

```bash
npx wrangler d1 execute subscription-tracker-db --file=./schema.sql --local
```

## Routes

Add these to `tool-proxy`:

- `toolara.dev/subscription-tracker/*`
- `www.toolara.dev/subscription-tracker/*`

## Free tier

- **D1**: 5 million reads/day, 100,000 writes/day
- **Workers**: 100,000 requests/day

## License

MIT
