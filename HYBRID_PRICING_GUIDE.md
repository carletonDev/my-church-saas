# Hybrid Pricing Model Guide

## 📊 Pricing Structure

Your Church SaaS platform uses a **hybrid pricing model** that combines:
1. **Flat base fee**: $19.99/month for all churches
2. **Freemium tier**: First 50 seats are completely free
3. **Graduated pricing**: Tiered rates for seats beyond 50

---

## 💰 Pricing Tiers

| Tier | Total Seats | Paid Seats | Rate per Paid Seat | Monthly Cost |
|------|-------------|------------|-------------------|--------------|
| **Freemium** | 1-50 | 0 | $0.00 | **$19.99** (flat fee only) |
| **Growth Plus** | 51-75 | 1-25 | $15.00 | **$19.99 + (seats - 50) × $15** |
| **Thrive Plus** | 76-200 | 26-150 | $12.00 | **$19.99 + (seats - 50) × $12** |
| **Enterprise** | 201+ | 151+ | $9.00 | **$19.99 + (seats - 50) × $9** |

---

## 🔢 Pricing Examples

### Example 1: Small Church (25 members)
- **Total Seats**: 25
- **Free Seats**: 25
- **Paid Seats**: 0
- **Monthly Cost**: **$19.99** (flat fee only)

### Example 2: Mid-Size Church (60 members)
- **Total Seats**: 60
- **Free Seats**: 50
- **Paid Seats**: 10 (at $15/seat)
- **Monthly Cost**: $19.99 + (10 × $15) = **$169.99**

### Example 3: Large Church (100 members)
- **Total Seats**: 100
- **Free Seats**: 50
- **Paid Seats**: 50 (at $12/seat)
- **Monthly Cost**: $19.99 + (50 × $12) = **$619.99**

### Example 4: Mega Church (250 members)
- **Total Seats**: 250
- **Free Seats**: 50
- **Paid Seats**: 200 (at $9/seat)
- **Monthly Cost**: $19.99 + (200 × $9) = **$1,819.99**

---

## 🏗️ Stripe Configuration

### Step 1: Create Products in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Products**
2. Create a product: "Church SaaS Subscription"

### Step 2: Create Prices

You need to create **4 separate prices**:

#### Price 1: Base Fee (Required)
- **Type**: Recurring
- **Price**: $19.99
- **Billing period**: Monthly
- **Usage type**: Licensed (fixed quantity)
- **Note**: This price will always have quantity = 1

#### Price 2: Growth Plus (51-75 seats)
- **Type**: Recurring
- **Price**: $15.00
- **Billing period**: Monthly
- **Usage type**: Licensed (per unit)
- **Note**: Quantity = (total seats - 50) when in this tier

#### Price 3: Thrive Plus (76-200 seats)
- **Type**: Recurring
- **Price**: $12.00
- **Billing period**: Monthly
- **Usage type**: Licensed (per unit)
- **Note**: Quantity = (total seats - 50) when in this tier

#### Price 4: Enterprise (201+ seats)
- **Type**: Recurring
- **Price**: $9.00
- **Billing period**: Monthly
- **Usage type**: Licensed (per unit)
- **Note**: Quantity = (total seats - 50) when in this tier

### Step 3: Copy Price IDs to .env

After creating the prices, copy their IDs to your `.env` file:

```env
STRIPE_PRICE_ID_BASE_FEE="price_1234..." # $19.99 base
STRIPE_PRICE_ID_GROWTH_PLUS="price_5678..." # $15/seat
STRIPE_PRICE_ID_THRIVE_PLUS="price_9012..." # $12/seat
STRIPE_PRICE_ID_ENTERPRISE="price_3456..." # $9/seat
```

---

## 🔄 How Subscription Updates Work

### Scenario 1: Church starts with 25 members

**Initial Subscription:**
- Items: [Base Fee × 1]
- Total: $19.99/month

### Scenario 2: Church grows to 60 members

**Updated Subscription:**
- Items: 
  - Base Fee × 1
  - Growth Plus × 10 (60 - 50 paid seats)
- Total: $19.99 + $150.00 = $169.99/month

### Scenario 3: Church grows to 100 members

**Updated Subscription:**
- Items:
  - Base Fee × 1
  - Thrive Plus × 50 (100 - 50 paid seats)
- Total: $19.99 + $600.00 = $619.99/month

**Note:** When crossing tier boundaries, the system automatically:
1. Removes the old tier price item
2. Adds the new tier price item
3. Calculates prorated amounts

---

## 🛠️ Implementation Details

### How Subscription Items Are Managed

```typescript
// For 25 members (Freemium)
[
  { price: BASE_FEE, quantity: 1 }
]

// For 60 members (Growth Plus)
[
  { price: BASE_FEE, quantity: 1 },
  { price: GROWTH_PLUS, quantity: 10 } // 60 - 50
]

// For 100 members (Thrive Plus)
[
  { price: BASE_FEE, quantity: 1 },
  { price: THRIVE_PLUS, quantity: 50 } // 100 - 50
]
```

### When Users Are Added/Removed

The system automatically:
1. Calculates new total seats
2. Determines appropriate pricing tier
3. Updates subscription items in Stripe
4. Handles tier transitions (e.g., Growth Plus → Thrive Plus)
5. Prorates the difference

---

## 📝 Key Functions

### `calculateTotalCost(seats: number)`
Calculates the total monthly cost including base fee and variable cost.

```typescript
calculateTotalCost(25)  // Returns 1999 ($19.99)
calculateTotalCost(60)  // Returns 16999 ($169.99)
calculateTotalCost(100) // Returns 61999 ($619.99)
```

### `getStripeSubscriptionItems(seats: number)`
Returns the array of subscription items for Stripe API.

```typescript
getStripeSubscriptionItems(25)
// [{ price: 'BASE_FEE', quantity: 1 }]

getStripeSubscriptionItems(60)
// [
//   { price: 'BASE_FEE', quantity: 1 },
//   { price: 'GROWTH_PLUS', quantity: 10 }
// ]
```

### `getPricingTier(seats: number)`
Determines which pricing tier applies.

```typescript
getPricingTier(25)  // Returns Freemium tier
getPricingTier(60)  // Returns Growth Plus tier
getPricingTier(100) // Returns Thrive Plus tier
```

---

## 🎯 Testing Checklist

### Before Going Live:

- [ ] Create all 4 prices in Stripe Dashboard
- [ ] Add price IDs to `.env` file
- [ ] Test subscription creation with different seat counts
- [ ] Test adding users (crossing tier boundaries)
- [ ] Test removing users (crossing tier boundaries back)
- [ ] Verify webhook updates subscription correctly
- [ ] Test proration calculations
- [ ] Verify billing portal shows correct amounts

### Test Scenarios:

1. **Create subscription with 25 seats**
   - Verify only base fee charged ($19.99)

2. **Add 26th user (cross into Growth Plus)**
   - Verify Growth Plus tier added
   - Verify proration calculated correctly

3. **Add users to reach 76 (cross into Thrive Plus)**
   - Verify tier switch from Growth Plus to Thrive Plus
   - Verify old tier removed, new tier added

4. **Remove users back to 50 (cross into Freemium)**
   - Verify tier removed
   - Verify only base fee remains

---

## 💡 Pro Tips

### For Development:
- Use Stripe test mode prices during development
- Use Stripe CLI to test webhooks locally:
  ```bash
  stripe listen --forward-to localhost:3000/api/webhooks/stripe
  ```

### For Production:
- Create separate prices for production
- Update webhook URL to production domain
- Test thoroughly before announcing pricing

### Customer Communication:
- Emphasize the **first 50 seats are free**
- Highlight the **flat $19.99 base** covers essential features
- Show examples of total cost at different sizes

---

## 🚨 Important Notes

1. **Base fee is always charged**: Even churches with 1-50 members pay $19.99/month
2. **Quantity field in database**: Stores total seats (not paid seats)
3. **Metadata tracking**: `totalSeats` is stored in subscription metadata
4. **Tier transitions**: Automatically handled by the update logic
5. **Proration**: Stripe handles proration automatically with `proration_behavior: 'always_invoice'`

---

## 📞 Support

If you have questions about the pricing model or implementation, refer to:
- [Stripe Subscriptions Documentation](https://stripe.com/docs/billing/subscriptions)
- [Stripe Proration Guide](https://stripe.com/docs/billing/subscriptions/prorations)
- Project README.md for implementation details
