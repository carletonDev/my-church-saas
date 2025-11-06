# 💰 Updated Pricing Model

## Formula
```
Total Monthly Cost = $19.99 (Base Fee) + Tiered Rate × (Seats - 50)
```

## Pricing Structure

### Base Plan
- **Price:** $19.99/month
- **Includes:** Up to 50 seats
- **Perfect for:** Small to medium churches

### Additional Seat Tiers

| Tier | Seat Range | Price per Additional Seat | Monthly Range |
|------|------------|---------------------------|---------------|
| **Base** | 1-50 | Included | $19.99 |
| **Growth** | 51-100 | $0.50/seat | $19.99 - $44.99 |
| **Professional** | 101-250 | $0.40/seat | $44.99 - $84.99 |
| **Enterprise** | 251-500 | $0.30/seat | $84.99 - $159.99 |
| **Enterprise Plus** | 501+ | $0.25/seat | $159.99+ |

## Examples

### Example 1: Small Church (30 seats)
```
Base Fee: $19.99
Additional Seats: 0 (within base 50)
Total: $19.99/month
```

### Example 2: Medium Church (75 seats)
```
Base Fee: $19.99
Additional Seats: 25 seats × $0.50 = $12.50
Total: $32.49/month
```

### Example 3: Large Church (150 seats)
```
Base Fee: $19.99
Additional Seats: 100 seats × $0.40 = $40.00
Total: $59.99/month
```

### Example 4: Mega Church (300 seats)
```
Base Fee: $19.99
Additional Seats: 250 seats × $0.30 = $75.00
Total: $94.99/month
```

## Implementation Notes

### In Your Code
The pricing calculation is handled automatically by:
- `calculateTotalCost(seats)` - Returns total monthly cost in cents
- `getPricingBreakdown(seats)` - Returns detailed breakdown
- `getPricingTier(seats)` - Returns applicable tier

### In Stripe Dashboard

**Option 1: Dynamic Price Calculation (Recommended)**
1. Create ONE product: "Church SaaS Subscription"
2. Create ONE recurring price (any amount, we'll override it)
3. When creating checkout sessions, use `price_data` to set the exact amount
4. Store `totalSeats` in subscription metadata

**Option 2: Metered Billing**
1. Create a metered billing price
2. Report usage (seats) each billing period
3. Stripe calculates based on your tiers

**Option 3: Multiple Prices**
1. Create separate prices for each tier
2. Switch prices when crossing tier boundaries
3. More complex to manage

## Stripe Setup (Recommended Approach)

### Step 1: Create Product
```
Product Name: Church SaaS Subscription
Description: Flexible pricing based on organization size
```

### Step 2: Don't Create Fixed Prices
Instead, use dynamic pricing in checkout sessions:

```typescript
stripe.checkout.sessions.create({
  line_items: [{
    price_data: {
      currency: 'usd',
      product_data: {
        name: 'Church SaaS Subscription',
        description: `Subscription for ${seats} seats`,
      },
      unit_amount: calculateTotalCost(seats), // Dynamic!
      recurring: { interval: 'month' },
    },
    quantity: 1,
  }],
  // ... rest of config
})
```

### Step 3: Store Seat Count in Metadata
```typescript
metadata: {
  organizationId: '...',
  totalSeats: seats.toString(),
}
```

### Step 4: Handle Seat Changes
When users are added/removed:
1. Calculate new total cost
2. Update subscription amount via Stripe API
3. Stripe prorates automatically

## Benefits of This Model

✅ **Scalable:** Grows with church size  
✅ **Affordable:** Base fee keeps small churches happy  
✅ **Predictable:** Clear tier structure  
✅ **Fair:** Only pay for what you use  
✅ **Automatic:** Adjusts when users added/removed  

## Code Usage

### Get Pricing Quote
```typescript
import { getPricingBreakdown } from '@/lib/stripe/config';

const breakdown = getPricingBreakdown(75);
console.log(breakdown);
// {
//   totalSeats: 75,
//   baseSeatsIncluded: 50,
//   baseFee: '$19.99',
//   additionalSeats: 25,
//   additionalSeatRate: '$0.50',
//   additionalSeatCost: '$12.50',
//   totalCost: '$32.49',
//   tier: 'Growth'
// }
```

### Calculate Cost
```typescript
import { calculateTotalCost } from '@/lib/stripe/config';

const cost = calculateTotalCost(75);
console.log(cost); // 3249 (cents)
```

### Display Pricing Table
```typescript
import { getPricingSummary } from '@/lib/stripe/config';

const tiers = getPricingSummary();
// Array of all tiers with formatted prices
```

## Migration from Old Model

If you were using the old 4-tier model:

1. Update `.env` to remove old price IDs:
   ```bash
   # OLD (remove these)
   STRIPE_PRICE_ID_STARTER="price_..."
   STRIPE_PRICE_ID_GROWTH="price_..."
   STRIPE_PRICE_ID_PROFESSIONAL="price_..."
   STRIPE_PRICE_ID_ENTERPRISE="price_..."
   
   # NEW (add this)
   STRIPE_PRICE_ID="price_..." # Single price ID
   ```

2. Code automatically uses new pricing model
3. Existing subscriptions will be updated on next billing cycle

## Questions?

**Q: What happens when a church crosses a tier boundary?**  
A: The system automatically recalculates and Stripe prorates the difference.

**Q: Can churches downgrade?**  
A: Yes! When users are removed, the cost automatically adjusts downward.

**Q: Is there a minimum?**  
A: Yes, $19.99/month base fee (covers up to 50 seats).

**Q: Is there a maximum?**  
A: No hard limit. For organizations over 10,000 seats, contact sales.
