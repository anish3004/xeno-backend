# Xeno — Backend (webhook + ingestion)

## Overview
Node.js + Express backend that ingests Shopify events (webhooks + sync), saves to Postgres via Prisma.

## Quick start
1. `cd xeno`
2. `npm install`
3. Create `.env` (see example below)
4. `npx prisma generate`
5. `npx prisma migrate deploy` (or `npx prisma migrate dev --name init` for development)
6. `node webhook-server.js`
7. (Optional) `node scheduler.js` for scheduled syncs

## .env example
SHOP_NAME=anish-retail
SHOPIFY_ADMIN_TOKEN=shpat_XXXXXXXXXXXXXXXX
DATABASE_URL="db_url"

## Endpoints
- POST /webhook/cart
- POST /webhook/checkout
- GET  /api/orders-list
- GET  /api/customers
- GET  /api/metrics

## Notes
- Use ngrok for local webhook testing.
- Confirm same DATABASE_URL used by dashboard.

