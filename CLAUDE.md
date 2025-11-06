# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Next.js 15 SaaS platform for church community groups featuring organization-based multi-tenancy, real-time discussions via Supabase Realtime, and a hybrid pricing model with Stripe integration.

**Core Stack:**
- Next.js 15 (App Router) with TypeScript
- Prisma ORM + PostgreSQL (Supabase)
- Supabase Auth + Realtime
- Stripe for subscriptions
- Tailwind CSS

## Development Commands

### Essential Commands
```bash
# Development
npm run dev              # Start dev server with Turbopack
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npx prisma studio        # Open Prisma Studio GUI
npx prisma generate      # Generate Prisma Client (run after schema changes)
npx prisma migrate dev   # Create and apply new migration
npx prisma migrate reset # Reset database (WARNING: deletes all data)
```

### Testing Stripe Webhooks Locally
```bash
# Install Stripe CLI first
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Architecture Overview

### Multi-Tenancy Model

**Organization-based isolation:** All data and billing are scoped to Organizations. Users belong to a single Organization with one of three roles:
- `OWNER` - Full control, billing management
- `ADMIN` - Manage users and discussions
- `MEMBER` - Standard access

### Authentication Flow

Three different authentication contexts:

1. **Client-side (browser):** Uses Supabase client with `anon` key
   - Created via `lib/supabase/client.ts`
   - Respects Row Level Security (RLS)
   - For real-time subscriptions and auth UI

2. **Server Actions:** Uses Prisma with direct database connection
   - Created via `lib/prisma.ts`
   - Bypasses RLS (must manually check permissions)
   - Used in `actions/*.actions.ts` files

3. **Webhooks:** Uses Supabase with `service_role` key
   - Bypasses RLS for system operations
   - Only used in `app/api/webhooks/stripe/route.ts`

### Row Level Security (RLS)

Database access is protected by RLS policies defined in `prisma/rls-policies.sql`. Policies ensure:
- Users can only access data within their organization
- Role-based permissions (OWNER > ADMIN > MEMBER)
- All Server Actions must manually verify `organizationId` matches authenticated user

**Important:** When writing Server Actions, always verify the user's organization:
```typescript
const user = await getCurrentUser(); // Gets authenticated user
// Verify organizationId matches before any data access
```

### Real-time Architecture

**Message Flow:**
1. User creates message → Server Action (`actions/message.actions.ts`)
2. Server Action saves to database via Prisma
3. Postgres triggers Supabase Realtime broadcast
4. All subscribed clients receive update instantly

**Client-side subscription pattern:**
```typescript
const supabase = createClient();
supabase
  .channel('messages')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages', filter: `discussion_id=eq.${id}` },
    handleNewMessage
  )
  .subscribe();
```

**Enable replication:** Messages table must have replication enabled in Supabase Dashboard → Database → Replication.

### Pricing Model (Hybrid)

**Structure:**
- Flat fee: $19.99/month for all organizations
- First 50 seats: FREE
- Seats 51-75: $9.99/seat
- Seats 76-200: $7.99/seat
- Seats 201+: $5.99/seat

**Implementation:**
- Pricing logic in `lib/stripe/config.ts`
- Subscriptions use multiple line items: one for base fee (quantity: 1), one for tiered seats (quantity: `seats - 50`)
- Automatic tier switching when users added/removed

**Stripe Price IDs required:**
- `STRIPE_PRICE_ID_BASE_FEE` - Fixed $19.99/month
- `STRIPE_PRICE_ID_GROWTH` - $9.99/seat (seats 51-75)
- `STRIPE_PRICE_ID_THRIVE` - $7.99/seat (seats 76-200)
- `STRIPE_PRICE_ID_ENTERPRISE` - $5.99/seat (seats 201+)

### Database Schema

**Key models:**
- `User` - Links to Supabase auth.users (UUID primary key)
- `Organization` - Tenant root, owns subscription
- `Subscription` - Stripe subscription data
- `Discussion` - Discussion threads with real-time messages
- `Message` - Individual messages, monitored by Realtime

**Important:** The `User.id` is a String in Prisma but maps to PostgreSQL UUID type (`@db.Uuid`). This matches Supabase auth.users.id.

## Common Tasks

### Adding a New Server Action

1. Create or edit file in `actions/` directory
2. Add `"use server"` directive at top
3. Get authenticated user and verify organization access
4. Use Prisma client from `lib/prisma.ts`
5. Export async function

### Updating the Database Schema

1. Modify `prisma/schema.prisma`
2. Run `npx prisma generate` to update Prisma Client
3. Run `npx prisma migrate dev --name descriptive_name`
4. If adding new tables, update `prisma/rls-policies.sql` with appropriate RLS policies
5. Apply RLS policies in Supabase SQL Editor

### Handling Stripe Webhooks

All webhook logic is in `app/api/webhooks/stripe/route.ts`. Events handled:
- `checkout.session.completed` - Create subscription
- `customer.subscription.updated` - Update subscription (quantity/tier changes)
- `customer.subscription.deleted` - Cancel subscription
- `invoice.paid` / `invoice.payment_failed` - Update subscription status

**Webhook verification:** Uses `STRIPE_WEBHOOK_SECRET` to verify request signature.

### Testing Subscription Changes

When users are added/removed, the subscription quantity should automatically update. The logic is typically:
1. User added → Increment organization user count
2. Calculate new tier via `getPricingTier(seats)`
3. Update Stripe subscription with `getStripeSubscriptionItems(seats)`
4. Stripe sends webhook → Update local subscription record

## Environment Setup

### Required Environment Variables

See `.env.example` for complete list. Critical ones:

```bash
# Database (Supabase)
DATABASE_URL="postgresql://..." # Connection pooler
DIRECT_URL="postgresql://..."   # Direct connection for migrations

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[project].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..." # Client-side
SUPABASE_SERVICE_ROLE_KEY="..."     # Server-side only

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID_BASE_FEE="price_..."
STRIPE_PRICE_ID_GROWTH="price_..."
STRIPE_PRICE_ID_THRIVE="price_..."
STRIPE_PRICE_ID_ENTERPRISE="price_..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Note:** Prisma CLI only reads `.env` files, not `.env.local`. Keep a `.env` file for database commands.

### Initial Setup

```bash
npm install
npx prisma generate
npx prisma migrate dev
# Then apply RLS policies in Supabase SQL Editor (copy from prisma/rls-policies.sql)
```

## Key Files

- `middleware.ts` - Auth middleware using Supabase (runs on all routes except webhooks/static)
- `lib/prisma.ts` - Prisma Client singleton
- `lib/supabase/server.ts` - Server-side Supabase client
- `lib/supabase/client.ts` - Client-side Supabase client
- `lib/stripe/config.ts` - Pricing tiers and calculation logic
- `actions/*.actions.ts` - Server Actions for data mutations
- `types/index.ts` - Shared TypeScript types
- `prisma/schema.prisma` - Database schema
- `prisma/rls-policies.sql` - Row Level Security policies

## Important Patterns

### Path Aliases

Uses `@/*` for absolute imports: `import { prisma } from "@/lib/prisma"`

### Server vs Client Components

- Server Actions live in `actions/` directory with `"use server"`
- Client components use `"use client"` directive
- Real-time subscriptions require client components
- Prefer Server Components for data fetching

### Error Handling in Server Actions

Server Actions should return result objects, not throw errors:
```typescript
return { success: false, error: "Message" }
// or
return { success: true, data: result }
```

### Subscription Updates

When organization user count changes:
1. Count active users in organization
2. Calculate new tier and pricing
3. Update Stripe subscription via Stripe API
4. Webhook updates local subscription record
5. Update `Organization.maxMembers` if needed

## Troubleshooting

### Prisma Can't Find DATABASE_URL
Ensure `.env` file exists (not just `.env.local`)

### RLS Permission Denied
1. Check user is authenticated (`auth.uid()` returns UUID)
2. Verify user exists in `users` table with correct `organization_id`
3. Review RLS policies in Supabase Dashboard

### Real-time Not Working
1. Enable replication for table in Supabase Dashboard
2. Check RLS policies allow SELECT
3. Verify client is authenticated

### Stripe Webhook Failures
1. Verify webhook secret in `.env`
2. Check webhook URL in Stripe Dashboard
3. Ensure all required events are selected
4. Test locally with Stripe CLI
