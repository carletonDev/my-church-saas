# Church SaaS Platform

A modern SaaS platform built for church community groups with organization-level subscriptions, real-time discussions, and per-seat graduated pricing.

## 🚀 Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma
- **Authentication:** Supabase Auth
- **Real-time:** Supabase Realtime
- **Payments:** Stripe
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

## 📋 Features

- ✅ **Organization-based Multi-tenancy** - All billing tied to organizations
- ✅ **Per-seat Graduated Pricing** - Automatic tier switching based on user count
- ✅ **Real-time Discussions** - Live message updates via Supabase Realtime
- ✅ **Role-based Access Control** - OWNER, ADMIN, MEMBER roles
- ✅ **Stripe Integration** - Subscription management with webhooks
- ✅ **Row Level Security** - Database-level access control
- ✅ **Server Actions** - Modern server-first architecture

## 🏗️ Project Structure

```
my-church-saas/
├── actions/                    # Server Actions
│   ├── user.actions.ts        # User management
│   ├── message.actions.ts     # Message CRUD
│   └── subscription.actions.ts # Subscription management
├── app/
│   ├── api/
│   │   └── webhooks/
│   │       └── stripe/        # Stripe webhook handler
│   │           └── route.ts
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── prisma.ts              # Prisma client singleton
│   ├── utils.ts               # Utility functions
│   ├── supabase/
│   │   ├── client.ts          # Client-side Supabase
│   │   ├── server.ts          # Server-side Supabase
│   │   └── middleware.ts      # Auth middleware
│   └── stripe/
│       ├── client.ts          # Stripe initialization
│       └── config.ts          # Pricing tiers
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── rls-policies.sql       # Row Level Security policies
├── types/
│   ├── index.ts               # Shared types
│   └── database.ts            # Database types
├── middleware.ts              # Next.js middleware
├── .env                       # Environment variables
└── package.json

## 🔧 Setup Instructions

### 1. Clone and Install

\`\`\`bash
git clone <your-repo>
cd my-church-saas
npm install
\`\`\`

### 2. Environment Variables

Copy the `.env` file and fill in your credentials:

\`\`\`env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Stripe Price IDs (create these in Stripe Dashboard)
STRIPE_PRICE_ID_STARTER="price_..."
STRIPE_PRICE_ID_GROWTH="price_..."
STRIPE_PRICE_ID_PROFESSIONAL="price_..."
STRIPE_PRICE_ID_ENTERPRISE="price_..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
\`\`\`

### 3. Database Setup

\`\`\`bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Apply RLS policies (in Supabase SQL Editor)
# Copy and run the contents of prisma/rls-policies.sql
\`\`\`

### 4. Supabase Configuration

1. Go to Supabase Dashboard → **Database** → **Replication**
2. Enable replication for the `messages` table
3. This enables real-time subscriptions

### 5. Stripe Configuration

#### Create Products and Prices

1. Go to Stripe Dashboard → **Products**
2. Create a product: "Church SaaS Subscription"
3. Create 4 recurring prices:
   - **Starter:** $10/seat/month (for 1-10 seats)
   - **Growth:** $8/seat/month (for 11-50 seats)
   - **Professional:** $6/seat/month (for 51-100 seats)
   - **Enterprise:** $5/seat/month (for 101+ seats)
4. Copy the price IDs to your `.env` file

#### Set Up Webhook

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy webhook secret to `.env` as `STRIPE_WEBHOOK_SECRET`

### 6. Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Visit [http://localhost:3000](http://localhost:3000)

## 💳 Pricing Tiers

| Tier | Seats | Price/Seat | Monthly Range |
|------|-------|------------|---------------|
| **Starter** | 1-10 | $10 | $10 - $100 |
| **Growth** | 11-50 | $8 | $88 - $400 |
| **Professional** | 51-100 | $6 | $306 - $600 |
| **Enterprise** | 101+ | $5 | $505+ |

The system automatically switches between tiers as users are added/removed.

## 🔐 Security

### Row Level Security (RLS)

All database tables are protected with RLS policies:

- Users can only access data within their organization
- OWNER role has full administrative control
- ADMIN role can manage users and discussions
- MEMBER role has read access and can create messages

### Authentication Flow

1. **Client-side:** Uses Supabase Auth with `anon` key (respects RLS)
2. **Server Actions:** Uses Prisma with direct connection (manual permission checks)
3. **Webhooks:** Uses `service_role` key (bypasses RLS for system operations)

## 📡 Real-time Architecture

### Message Flow

1. **User creates message** → Server Action (`createMessage`)
2. **Message saved to DB** → Triggers Postgres change
3. **Supabase broadcasts** → All subscribed clients receive update
4. **Client components update** → Real-time UI refresh

### Client-side Subscription

\`\`\`typescript
const supabase = createClient();

supabase
  .channel('messages')
  .on('postgres_changes', 
    { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'messages',
      filter: \`discussion_id=eq.\${discussionId}\`
    },
    (payload) => {
      // Handle new message
    }
  )
  .subscribe();
\`\`\`

## 🛠️ Development

### Useful Commands

\`\`\`bash
# Development
npm run dev              # Start dev server with Turbopack
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Format with Prettier
npm run type-check       # TypeScript type checking

# Database
npx prisma studio        # Open Prisma Studio (DB GUI)
npx prisma generate      # Generate Prisma Client
npx prisma migrate dev   # Create new migration
npx prisma migrate reset # Reset database (deletes all data!)
\`\`\`

### Testing RLS Policies

\`\`\`sql
-- In Supabase SQL Editor
SET request.jwt.claim.sub = 'user-uuid-here';

-- Test queries
SELECT * FROM users;
SELECT * FROM messages;

-- Reset
RESET request.jwt.claim.sub;
\`\`\`

## 🚀 Deployment

### Vercel Deployment

1. **Push to GitHub**
2. **Connect to Vercel**
3. **Set Environment Variables** (all from `.env`)
4. **Deploy!**

### Important for Production

1. **Update Stripe Webhook URL** to production domain
2. **Use production Stripe keys** (not test keys)
3. **Enable connection pooling** in Supabase:
   \`\`\`env
   DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://...supabase.com:5432/postgres"
   \`\`\`
4. **Update `NEXT_PUBLIC_APP_URL`** to production domain

## 📚 API Reference

### Server Actions

#### User Management

- `addUserToOrganization(email, name, role)`
- `removeUserFromOrganization(userId)`
- `updateUserRole(userId, newRole)`
- `getOrganizationUsers()`

#### Messages

- `createMessage(discussionId, content, parentMessageId?)`
- `editMessage(messageId, content)`
- `deleteMessage(messageId)`
- `getDiscussionMessages(discussionId, limit?, cursor?)`

#### Subscriptions

- `createCheckoutSession(seats)`
- `createPortalSession()`
- `cancelSubscription()`
- `reactivateSubscription()`
- `getSubscriptionDetails()`

## 🐛 Troubleshooting

### Prisma Can't Find DATABASE_URL

Make sure you have a `.env` file (not just `.env.local`) because Prisma CLI only reads `.env`.

### RLS Permission Denied

1. Check user is authenticated: `auth.uid()` should return a UUID
2. Verify user exists in `users` table
3. Check `organization_id` matches
4. Review RLS policies in Supabase Dashboard

### Stripe Webhook Not Working

1. Verify webhook secret in `.env`
2. Check webhook URL in Stripe Dashboard
3. Ensure events are selected
4. Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### Real-time Not Working

1. Enable replication for `messages` table in Supabase
2. Check RLS policies allow SELECT on messages
3. Verify client is authenticated
4. Check browser console for connection errors

## 📝 Todo

- [ ] Email notifications for subscription events
- [ ] Discussion moderation tools
- [ ] File attachments in messages
- [ ] User avatars
- [ ] Organization branding
- [ ] Analytics dashboard
- [ ] Export data functionality

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

---

Built with ❤️ for church communities
\`\`\`
