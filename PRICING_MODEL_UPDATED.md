# 💰 Hybrid Pricing Model - Updated Configuration

## 🎯 Overview

The Church SaaS platform now implements a **hybrid pricing model** where:
- **Churches** pay a flat monthly fee
- **First 50 seats** are completely free
- **Additional seats** (51+) are billed using a tiered structure

---

## 📊 Pricing Structure

### Base Fee (Paid by Church)
```
Flat Monthly Fee: $19.99
- Charged to every church regardless of size
- Covers platform hosting, maintenance, and base features
```

### Freemium Threshold
```
First 50 Seats: FREE
- No per-seat charges for the first 50 members
- Perfect for small to medium churches
```

### Tiered Per-Seat Pricing (Seats 51+)
```
Tier 1 - Growth (51-75 seats):
├── Price per seat: $9.99/month
├── Applied to: Seats above 50
└── Example: 60 seats = $19.99 + (10 × $9.99) = $119.89/month

Tier 2 - Thrive (76-200 seats):
├── Price per seat: $7.99/month
├── Applied to: Seats above 50
└── Example: 100 seats = $19.99 + (50 × $7.99) = $419.49/month

Tier 3 - Enterprise (201+ seats):
├── Price per seat: $5.99/month
├── Applied to: Seats above 50
└── Example: 250 seats = $19.99 + (200 × $5.99) = $1,217.99/month
```

---

## 💡 Pricing Examples

| Total Seats | Tier | Paid Seats | Calculation | Monthly Cost |
|------------|------|------------|-------------|--------------|
| 10 | Freemium | 0 | $19.99 + (0 × $0) | **$19.99** |
| 50 | Freemium | 0 | $19.99 + (0 × $0) | **$19.99** |
| 51 | Growth | 1 | $19.99 + (1 × $9.99) | **$29.98** |
| 60 | Growth | 10 | $19.99 + (10 × $9.99) | **$119.89** |
| 75 | Growth | 25 | $19.99 + (25 × $9.99) | **$269.74** |
| 76 | Thrive | 26 | $19.99 + (26 × $7.99) | **$227.73** |
| 100 | Thrive | 50 | $19.99 + (50 × $7.99) | **$419.49** |
| 200 | Thrive | 150 | $19.99 + (150 × $7.99) | **$1,218.49** |
| 201 | Enterprise | 151 | $19.99 + (151 × $5.99) | **$924.48** |
| 250 | Enterprise | 200 | $19.99 + (200 × $5.99) | **$1,217.99** |
| 500 | Enterprise | 450 | $19.99 + (450 × $5.99) | **$2,715.49** |

---

## 🔄 Tier Transition Examples

### Growing from Growth to Thrive (75 → 76 seats)

**Before (75 seats - Growth tier):**
```
$19.99 + (25 × $9.99) = $269.74/month
```

**After (76 seats - Thrive tier):**
```
$19.99 + (26 × $7.99) = $227.73/month
```

**Result:** ✅ **Saves $41.01/month** by moving to Thrive tier!

### Growing from Thrive to Enterprise (200 → 201 seats)

**Before (200 seats - Thrive tier):**
```
$19.99 + (150 × $7.99) = $1,218.49/month
```

**After (201 seats - Enterprise tier):**
```
$19.99 + (151 × $5.99) = $924.48/month
```

**Result:** ✅ **Saves $294.01/month** by moving to Enterprise tier!

---

## 🛠️ Technical Implementation

### 1. Updated Constants

```typescript
export const FLAT_FEE_CENTS = 1999; // $19.99
export const FREE_SEATS_THRESHOLD = 50;
```

### 2. Updated Pricing Tiers

```typescript
export const PRICING_TIERS: PricingTier[] = [
  {
    minSeats: 1,
    maxSeats: 50,
    pricePerPaidSeat: 0, // $0.00
    label: "Freemium",
  },
  {
    minSeats: 51,
    maxSeats: 75,
    pricePerPaidSeat: 999, // $9.99
    label: "Growth",
  },
  {
    minSeats: 76,
    maxSeats: 200,
    pricePerPaidSeat: 799, // $7.99
    label: "Thrive",
  },
  {
    minSeats: 201,
    maxSeats: null,
    pricePerPaidSeat: 599, // $5.99
    label: "Enterprise",
  },
];
```

### 3. Updated Cost Calculation

```typescript
export function calculateTotalCost(seats: number): number {
  const tier = getPricingTier(seats);
  
  // Calculate paid seats (seats over 50)
  const paidSeats = Math.max(0, seats - FREE_SEATS_THRESHOLD);
  
  // Calculate variable cost
  const variableCost = paidSeats * tier.pricePerPaidSeat;
  
  // Total = Flat Fee + Variable Cost
  return FLAT_FEE_CENTS + variableCost;
}
```

### 4. New Function: getStripePriceIds()

```typescript
export function getStripePriceIds(seats: number): string[] {
  const tier = getPricingTier(seats);
  const priceIds: string[] = [];
  
  // Always include base fee
  priceIds.push(STRIPE_PRICE_IDS.BASE_FEE);
  
  // Only add tiered price if seats > 50
  const paidSeats = Math.max(0, seats - FREE_SEATS_THRESHOLD);
  
  if (paidSeats > 0) {
    switch (tier.label) {
      case "Growth":
        priceIds.push(STRIPE_PRICE_IDS.GROWTH);
        break;
      case "Thrive":
        priceIds.push(STRIPE_PRICE_IDS.THRIVE);
        break;
      case "Enterprise":
        priceIds.push(STRIPE_PRICE_IDS.ENTERPRISE);
        break;
    }
  }
  
  return priceIds; // [BASE_FEE] or [BASE_FEE, TIER_PRICE_ID]
}
```

### 5. Updated Stripe Price IDs

```typescript
export const STRIPE_PRICE_IDS = {
  BASE_FEE: process.env.STRIPE_PRICE_ID_BASE_FEE!, // $19.99
  GROWTH: process.env.STRIPE_PRICE_ID_GROWTH!, // $9.99/seat
  THRIVE: process.env.STRIPE_PRICE_ID_THRIVE!, // $7.99/seat
  ENTERPRISE: process.env.STRIPE_PRICE_ID_ENTERPRISE!, // $5.99/seat
} as const;
```

---

## 🎨 Environment Variables

Update your `.env.local` file:

```bash
# Base fee - $19.99/month flat fee for all churches
STRIPE_PRICE_ID_BASE_FEE="price_..."

# Tiered pricing for seats above 50
STRIPE_PRICE_ID_GROWTH="price_..."       # $9.99/seat (seats 51-75)
STRIPE_PRICE_ID_THRIVE="price_..."       # $7.99/seat (seats 76-200)
STRIPE_PRICE_ID_ENTERPRISE="price_..."   # $5.99/seat (seats 201+)
```

---

## 🏗️ Stripe Dashboard Setup

### Step 1: Create Base Fee Product

```
Product Name: Church SaaS - Platform Fee
Description: Monthly platform access fee

Pricing Model:
├── Type: Recurring
├── Billing period: Monthly
├── Price: $19.99
├── Usage type: Licensed
└── Quantity: Fixed at 1 (not adjustable)
```

### Step 2: Create Growth Tier Product

```
Product Name: Church SaaS - Growth Tier
Description: Per-seat pricing for seats 51-75

Pricing Model:
├── Type: Recurring
├── Billing period: Monthly
├── Price: $9.99
├── Usage type: Licensed
└── Quantity: Variable (adjustable)
```

### Step 3: Create Thrive Tier Product

```
Product Name: Church SaaS - Thrive Tier
Description: Per-seat pricing for seats 76-200

Pricing Model:
├── Type: Recurring
├── Billing period: Monthly
├── Price: $7.99
├── Usage type: Licensed
└── Quantity: Variable (adjustable)
```

### Step 4: Create Enterprise Tier Product

```
Product Name: Church SaaS - Enterprise Tier
Description: Per-seat pricing for seats 201+

Pricing Model:
├── Type: Recurring
├── Billing period: Monthly
├── Price: $5.99
├── Usage type: Licensed
└── Quantity: Variable (adjustable)
```

---

## 📝 Usage Examples

### Example 1: Freemium Church (25 seats)

```typescript
const seats = 25;
const priceIds = getStripePriceIds(seats);
console.log(priceIds);
// Output: ["price_BASE_FEE_ID"]

const cost = calculateTotalCost(seats);
console.log(formatPrice(cost));
// Output: "$19.99"
```

### Example 2: Growth Tier Church (60 seats)

```typescript
const seats = 60;
const priceIds = getStripePriceIds(seats);
console.log(priceIds);
// Output: ["price_BASE_FEE_ID", "price_GROWTH_ID"]

const items = getStripeSubscriptionItems(seats);
console.log(items);
// Output: [
//   { price: "price_BASE_FEE_ID", quantity: 1 },
//   { price: "price_GROWTH_ID", quantity: 10 }
// ]

const cost = calculateTotalCost(seats);
console.log(formatPrice(cost));
// Output: "$119.89"
```

### Example 3: Thrive Tier Church (100 seats)

```typescript
const seats = 100;
const priceIds = getStripePriceIds(seats);
console.log(priceIds);
// Output: ["price_BASE_FEE_ID", "price_THRIVE_ID"]

const items = getStripeSubscriptionItems(seats);
console.log(items);
// Output: [
//   { price: "price_BASE_FEE_ID", quantity: 1 },
//   { price: "price_THRIVE_ID", quantity: 50 }
// ]

const cost = calculateTotalCost(seats);
console.log(formatPrice(cost));
// Output: "$419.49"
```

### Example 4: Enterprise Tier Church (250 seats)

```typescript
const seats = 250;
const priceIds = getStripePriceIds(seats);
console.log(priceIds);
// Output: ["price_BASE_FEE_ID", "price_ENTERPRISE_ID"]

const items = getStripeSubscriptionItems(seats);
console.log(items);
// Output: [
//   { price: "price_BASE_FEE_ID", quantity: 1 },
//   { price: "price_ENTERPRISE_ID", quantity: 200 }
// ]

const cost = calculateTotalCost(seats);
console.log(formatPrice(cost));
// Output: "$1,217.99"
```

---

## ✅ Changes Summary

### What Changed:

1. ✅ **Tier Names Updated**
   - `Growth Plus` → `Growth`
   - `Thrive Plus` → `Thrive`
   - `Enterprise` (unchanged)

2. ✅ **Pricing Reduced**
   - Growth: $15.00 → **$9.99** per seat
   - Thrive: $12.00 → **$7.99** per seat
   - Enterprise: $9.00 → **$5.99** per seat

3. ✅ **New Function Added**
   - `getStripePriceIds(seats: number): string[]`
   - Returns array: `[BASE_FEE]` or `[BASE_FEE, TIER_PRICE_ID]`

4. ✅ **Updated Environment Variables**
   - `STRIPE_PRICE_ID_GROWTH_PLUS` → `STRIPE_PRICE_ID_GROWTH`
   - `STRIPE_PRICE_ID_THRIVE_PLUS` → `STRIPE_PRICE_ID_THRIVE`

### What Stayed the Same:

- ✅ Flat fee: $19.99/month
- ✅ Free threshold: 50 seats
- ✅ Tier boundaries: 51-75, 76-200, 201+
- ✅ Calculation logic: `FLAT_FEE + (paidSeats × pricePerSeat)`

---

## 🚀 Next Steps

1. **Update Stripe Dashboard**
   - Create 4 new products with updated prices
   - Copy the Price IDs

2. **Update Environment Variables**
   - Add all 4 Price IDs to `.env.local`
   - Update production environment variables

3. **Test the Implementation**
   - Test with various seat counts
   - Verify tier switching works correctly
   - Check Stripe webhook integration

4. **Update UI/Documentation**
   - Update pricing page to reflect new rates
   - Update customer-facing documentation
   - Update marketing materials

---

## 📊 Cost Comparison (Old vs New)

| Seats | Old Price | New Price | Savings |
|-------|-----------|-----------|---------|
| 60 | $169.99 | $119.89 | $50.10 |
| 75 | $394.99 | $269.74 | $125.25 |
| 100 | $619.99 | $419.49 | $200.50 |
| 200 | $1,819.99 | $1,218.49 | $601.50 |
| 250 | $1,819.99 | $1,217.99 | $602.00 |

**Average Savings: ~33%** across all tiers! 🎉

---

**Need Help?** Refer to `STRIPE_SETUP_GUIDE.md` for detailed Stripe configuration instructions.
