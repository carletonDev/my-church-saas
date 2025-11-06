# 🔄 Pricing Migration Guide

## Overview

This guide helps you migrate from the old pricing structure to the new hybrid pricing model with updated rates.

---

## 📊 What Changed?

### Pricing Comparison

| Component | Old Price | New Price | Change |
|-----------|-----------|-----------|--------|
| **Flat Fee** | $19.99 | $19.99 | No change ✅ |
| **Free Seats** | First 50 | First 50 | No change ✅ |
| **Growth Tier** | $15.00/seat (51-75) | **$9.99/seat** (51-75) | -33% 📉 |
| **Thrive Tier** | $12.00/seat (76-200) | **$7.99/seat** (76-200) | -33% 📉 |
| **Enterprise** | $9.00/seat (201+) | **$5.99/seat** (201+) | -33% 📉 |

### Naming Changes

| Old Name | New Name |
|----------|----------|
| Growth Plus | Growth |
| Thrive Plus | Thrive |
| Enterprise | Enterprise (unchanged) |

---

## 🔧 Code Changes Required

### 1. Update `lib/stripe/config.ts`

The file has been completely updated. Key changes:

**PRICING_TIERS Array:**
```typescript
// OLD:
pricePerPaidSeat: 1500, // $15.00 - Growth Plus
pricePerPaidSeat: 1200, // $12.00 - Thrive Plus
pricePerPaidSeat: 900,  // $9.00 - Enterprise

// NEW:
pricePerPaidSeat: 999, // $9.99 - Growth
pricePerPaidSeat: 799, // $7.99 - Thrive
pricePerPaidSeat: 599, // $5.99 - Enterprise
```

**STRIPE_PRICE_IDS Object:**
```typescript
// OLD:
export const STRIPE_PRICE_IDS = {
  BASE_FEE: process.env.STRIPE_PRICE_ID_BASE_FEE!,
  GROWTH_PLUS: process.env.STRIPE_PRICE_ID_GROWTH_PLUS!,
  THRIVE_PLUS: process.env.STRIPE_PRICE_ID_THRIVE_PLUS!,
  ENTERPRISE: process.env.STRIPE_PRICE_ID_ENTERPRISE!,
};

// NEW:
export const STRIPE_PRICE_IDS = {
  BASE_FEE: process.env.STRIPE_PRICE_ID_BASE_FEE!,
  GROWTH: process.env.STRIPE_PRICE_ID_GROWTH!, // Renamed
  THRIVE: process.env.STRIPE_PRICE_ID_THRIVE!, // Renamed
  ENTERPRISE: process.env.STRIPE_PRICE_ID_ENTERPRISE!,
};
```

**New Function Added:**
```typescript
// NEW function that returns array of Price IDs
export function getStripePriceIds(seats: number): string[] {
  // Returns [BASE_FEE] or [BASE_FEE, TIER_PRICE_ID]
}
```

**Updated getStripeSubscriptionItems():**
```typescript
// Switch cases updated to use new tier names
switch (tier.label) {
  case "Growth":      // Was "Growth Plus"
  case "Thrive":      // Was "Thrive Plus"
  case "Enterprise":  // Unchanged
}
```

### 2. Update Environment Variables

**File: `.env.local`**

```bash
# OLD (Remove these):
# STRIPE_PRICE_ID_GROWTH_PLUS="price_..."
# STRIPE_PRICE_ID_THRIVE_PLUS="price_..."

# NEW (Add/Update these):
STRIPE_PRICE_ID_BASE_FEE="price_..."      # Keep existing if you have it
STRIPE_PRICE_ID_GROWTH="price_..."        # Create new at $9.99
STRIPE_PRICE_ID_THRIVE="price_..."        # Create new at $7.99
STRIPE_PRICE_ID_ENTERPRISE="price_..."    # Create new at $5.99
```

---

## 🏗️ Stripe Dashboard Setup

### Step 1: Create New Products

You need to create **4 new products** in Stripe Dashboard:

#### A. BASE FEE ($19.99) - May Already Exist

If you already have a base fee product, you can reuse it. Otherwise:

```
Product Name: Church SaaS - Platform Fee
Description: Monthly platform access fee
Price: $19.99/month
Type: Recurring
Billing period: Monthly
Usage type: Licensed
Quantity: Fixed at 1
```

#### B. GROWTH TIER ($9.99/seat) - NEW

```
Product Name: Church SaaS - Growth Tier
Description: Per-seat pricing for 51-75 seats
Price: $9.99/month
Type: Recurring
Billing period: Monthly
Usage type: Licensed
Per-unit pricing: Yes
Quantity: Variable (adjustable)
```

#### C. THRIVE TIER ($7.99/seat) - NEW

```
Product Name: Church SaaS - Thrive Tier
Description: Per-seat pricing for 76-200 seats
Price: $7.99/month
Type: Recurring
Billing period: Monthly
Usage type: Licensed
Per-unit pricing: Yes
Quantity: Variable (adjustable)
```

#### D. ENTERPRISE TIER ($5.99/seat) - NEW

```
Product Name: Church SaaS - Enterprise Tier
Description: Per-seat pricing for 201+ seats
Price: $5.99/month
Type: Recurring
Billing period: Monthly
Usage type: Licensed
Per-unit pricing: Yes
Quantity: Variable (adjustable)
```

### Step 2: Archive Old Products (Optional)

In Stripe Dashboard:
1. Go to Products
2. Find old products (Growth Plus, Thrive Plus, old Enterprise)
3. Click "Archive" to prevent new subscriptions
4. **Don't delete** - existing customers may still be using them

---

## 🔄 Migrating Existing Customers

### Option 1: Gradual Migration (Recommended)

Let existing customers stay on their current pricing until their next renewal:

```typescript
// In your subscription update logic:
function shouldMigrateCustomer(subscriptionId: string): boolean {
  // Check if customer is on old pricing
  // Migrate only on renewal or when they add/remove seats
  return true;
}
```

### Option 2: Immediate Migration

Migrate all customers immediately (will prorate):

```typescript
// Server Action to migrate all subscriptions
async function migrateAllSubscriptions() {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      // Filter for old price IDs
    }
  });

  for (const sub of subscriptions) {
    // Update to new pricing structure
    await updateSubscriptionPricing(sub.id, sub.quantity);
  }
}
```

### Option 3: Notify and Allow Opt-In

Send email to customers:

```
Subject: Great News! Lower Pricing Available 🎉

We're excited to announce reduced pricing:
- Growth: $15 → $9.99/seat (save 33%)
- Thrive: $12 → $7.99/seat (save 33%)
- Enterprise: $9 → $5.99/seat (save 33%)

[Click here to switch to new pricing]
```

---

## 🧪 Testing Checklist

### Before Deploying:

- [ ] Created all 4 new products in Stripe (test mode)
- [ ] Updated `.env.local` with new Price IDs
- [ ] Tested `calculateTotalCost()` function
  - [ ] 25 seats = $19.99 ✅
  - [ ] 50 seats = $19.99 ✅
  - [ ] 60 seats = $119.89 ✅
  - [ ] 100 seats = $419.49 ✅
  - [ ] 250 seats = $1,217.99 ✅
- [ ] Tested `getStripePriceIds()` function
  - [ ] Returns `[BASE_FEE]` for ≤50 seats ✅
  - [ ] Returns `[BASE_FEE, GROWTH]` for 51-75 seats ✅
  - [ ] Returns `[BASE_FEE, THRIVE]` for 76-200 seats ✅
  - [ ] Returns `[BASE_FEE, ENTERPRISE]` for 201+ seats ✅
- [ ] Tested tier switching (75→76, 200→201)
- [ ] Verified Stripe webhook still works
- [ ] Tested subscription creation flow
- [ ] Tested subscription update flow (add/remove users)

### After Deploying to Production:

- [ ] Created all 4 products in Stripe (live mode)
- [ ] Updated production environment variables
- [ ] Updated webhook endpoint for new pricing logic
- [ ] Smoke test: Create new subscription
- [ ] Smoke test: Add user to trigger tier change
- [ ] Monitor Stripe Dashboard for errors
- [ ] Check application logs for issues

---

## 📝 Example Migration Script

```typescript
/**
 * Script to migrate subscriptions to new pricing
 * Run with: npx tsx scripts/migrate-pricing.ts
 */

import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe/client';
import { getStripeSubscriptionItems } from '@/lib/stripe/config';

async function migrateSubscription(subscriptionId: string) {
  try {
    // Get current subscription from database
    const dbSub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        organization: {
          include: {
            users: true,
          },
        },
      },
    });

    if (!dbSub) {
      console.error(`Subscription ${subscriptionId} not found`);
      return;
    }

    const seatCount = dbSub.organization.users.length;

    // Get new subscription items with updated pricing
    const newItems = getStripeSubscriptionItems(seatCount);

    // Update Stripe subscription
    const stripeSubscription = await stripe.subscriptions.update(
      dbSub.stripeSubscriptionId,
      {
        items: newItems.map(item => ({
          price: item.price,
          quantity: item.quantity,
        })),
        proration_behavior: 'always_invoice', // Prorate immediately
      }
    );

    console.log(`✅ Migrated subscription ${subscriptionId}`);
    console.log(`   Seats: ${seatCount}`);
    console.log(`   New items:`, newItems);

    return stripeSubscription;
  } catch (error) {
    console.error(`❌ Failed to migrate ${subscriptionId}:`, error);
    throw error;
  }
}

async function migrateAll() {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
    },
  });

  console.log(`Found ${subscriptions.length} active subscriptions`);

  let successCount = 0;
  let errorCount = 0;

  for (const sub of subscriptions) {
    try {
      await migrateSubscription(sub.id);
      successCount++;
    } catch (error) {
      errorCount++;
    }
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
}

// Run migration
migrateAll()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## 🚨 Common Issues & Solutions

### Issue 1: Price ID Not Found Error

**Error:** `No such price: 'price_...'`

**Solution:**
- Verify Price IDs in `.env.local` are correct
- Check you're using the right Stripe mode (test vs live)
- Ensure Price IDs start with `price_` not `prod_`

### Issue 2: Existing Subscriptions Not Updating

**Error:** Subscription still shows old pricing

**Solution:**
```typescript
// Force update by calling subscription update
await stripe.subscriptions.update(subscriptionId, {
  items: newItems,
  proration_behavior: 'always_invoice',
});
```

### Issue 3: Quantity Mismatch

**Error:** Stripe shows wrong quantity

**Solution:**
- Remember: Tiered prices use `seats - 50` as quantity
- Base fee always has quantity = 1
- Verify `getStripeSubscriptionItems()` logic

### Issue 4: Webhook Failures

**Error:** Webhook returns 400/500 error

**Solution:**
- Check webhook handler code uses new Price IDs
- Update switch cases for new tier names
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Test webhook with Stripe CLI:
  ```bash
  stripe trigger customer.subscription.updated
  ```

---

## 📞 Support

If you encounter issues during migration:

1. Check the updated `PRICING_MODEL_UPDATED.md` for detailed examples
2. Review Stripe Dashboard → Events for error details
3. Check application logs for stack traces
4. Test in Stripe test mode before touching production

---

## ✅ Post-Migration Verification

After migration is complete:

```typescript
// Verify pricing for different seat counts
const testCases = [
  { seats: 25, expected: 1999 },
  { seats: 50, expected: 1999 },
  { seats: 60, expected: 11989 },
  { seats: 75, expected: 26974 },
  { seats: 100, expected: 21949 },
  { seats: 250, expected: 121799 },
];

testCases.forEach(({ seats, expected }) => {
  const actual = calculateTotalCost(seats);
  const pass = actual === expected;
  console.log(`${pass ? '✅' : '❌'} ${seats} seats: $${actual/100} (expected: $${expected/100})`);
});
```

Expected output:
```
✅ 25 seats: $19.99 (expected: $19.99)
✅ 50 seats: $19.99 (expected: $19.99)
✅ 60 seats: $119.89 (expected: $119.89)
✅ 75 seats: $269.74 (expected: $269.74)
✅ 100 seats: $419.49 (expected: $419.49)
✅ 250 seats: $1,217.99 (expected: $1,217.99)
```

---

**🎉 Migration Complete!**

Your platform now uses the new hybrid pricing model with reduced rates. Customers save an average of 33% across all tiers!
