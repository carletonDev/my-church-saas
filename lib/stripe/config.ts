/**
 * Stripe Pricing Configuration - HYBRID MODEL (Flat Fee + First 50 Seats Free + Tiered Rate)
 * 
 * Defines the tiered pricing for seats *above* the 50-seat freemium threshold.
 * 
 * Pricing Logic:
 * - Flat Fee: $19.99/month for all churches.
 * - Seats 1-50: $0.00/seat/month (completely free).
 * - Seats 51-75: All seats *above 50* are charged at $9.99/seat/month.
 * - Seats 76-200: All seats *above 50* are charged at $7.99/seat/month.
 * - Seats 201+ : All seats *above 50* are charged at $5.99/seat/month.
 */

/**
 * Flat monthly platform fee for all churches
 */
export const FLAT_FEE_CENTS = 1999; // $19.99

/**
 * Number of free seats included before tiered pricing kicks in
 */
export const FREE_SEATS_THRESHOLD = 50;

/**
 * Pricing tier configuration
 */
export interface PricingTier {
  minSeats: number;
  maxSeats: number | null; // null means unlimited
  pricePerPaidSeat: number; // in cents - this is the rate applied to seats > 50
  label: string;
}

/**
 * Graduated pricing tiers for PAID SEATS (Seats > 50)
 */
export const PRICING_TIERS: PricingTier[] = [
  {
    minSeats: 1, // Any church starts here
    maxSeats: 50,
    pricePerPaidSeat: 0, // $0.00 for seats 1-50
    label: "Freemium",
  },
  {
    minSeats: 51,
    maxSeats: 75,
    pricePerPaidSeat: 999, // $9.99 per seat above 50
    label: "Growth",
  },
  {
    minSeats: 76,
    maxSeats: 200,
    pricePerPaidSeat: 799, // $7.99 per seat above 50
    label: "Thrive",
  },
  {
    minSeats: 201,
    maxSeats: null,
    pricePerPaidSeat: 599, // $5.99 per seat above 50
    label: "Enterprise",
  },
];

/**
 * Gets the appropriate pricing tier for a given number of seats
 * 
 * @param seats - Number of seats
 * @returns Pricing tier configuration
 * 
 * @example
 * getPricingTier(25) // Returns Freemium tier
 * getPricingTier(60) // Returns Growth tier ($9.99/seat above 50)
 */
export function getPricingTier(seats: number): PricingTier {
  const tier = PRICING_TIERS.find(
    (t) => seats >= t.minSeats && (t.maxSeats === null || seats <= t.maxSeats)
  );

  if (!tier) {
    // Fallback to the last tier if no match found
    return PRICING_TIERS[PRICING_TIERS.length - 1];
  }

  return tier;
}

/**
 * Calculates the total monthly cost for a given number of seats (Hybrid Logic)
 * 
 * @param seats - Number of seats
 * @returns Total cost in cents
 * 
 * @example
 * calculateTotalCost(25) // Returns 1999 ($19.99 flat fee only)
 * calculateTotalCost(50) // Returns 1999 ($19.99 flat fee only)
 * calculateTotalCost(60) // Returns 11989 ($19.99 + 10 paid seats * $9.99)
 * calculateTotalCost(75) // Returns 26974 ($19.99 + 25 paid seats * $9.99)
 * calculateTotalCost(100) // Returns 21949 ($19.99 + 50 paid seats * $7.99)
 * calculateTotalCost(250) // Returns 13979 ($19.99 + 200 paid seats * $5.99)
 */
export function calculateTotalCost(seats: number): number {
  const tier = getPricingTier(seats);
  
  // 1. Calculate the number of paid seats (seats over 50)
  const paidSeats = Math.max(0, seats - FREE_SEATS_THRESHOLD);

  // 2. Calculate the variable cost based on the tier's price per paid seat
  const variableCost = paidSeats * tier.pricePerPaidSeat;
  
  // 3. Total cost = Flat Fee + Variable Cost
  return FLAT_FEE_CENTS + variableCost;
}

/**
 * Calculates just the variable cost (excluding flat fee)
 * 
 * @param seats - Number of seats
 * @returns Variable cost in cents
 */
export function calculateVariableCost(seats: number): number {
  const tier = getPricingTier(seats);
  const paidSeats = Math.max(0, seats - FREE_SEATS_THRESHOLD);
  return paidSeats * tier.pricePerPaidSeat;
}

/**
 * Formats the price per seat for display
 * 
 * @param priceInCents - Price in cents
 * @returns Formatted price string
 * 
 * @example
 * formatPrice(999) // Returns "$9.99"
 */
export function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceInCents / 100);
}

/**
 * Gets a summary of pricing for display in the UI
 * 
 * @returns Array of tier summaries
 */
export function getPricingSummary() {
  return PRICING_TIERS.map((tier) => {
    let monthlyMaxCents: number;

    // Calculate paid seats for the minimum of the range
    const minPaidSeats = Math.max(0, tier.minSeats - FREE_SEATS_THRESHOLD);
    const monthlyMinCents = FLAT_FEE_CENTS + (minPaidSeats * tier.pricePerPaidSeat);
    
    // Calculate paid seats for the maximum of the range
    if (tier.maxSeats !== null) {
      const maxPaidSeats = Math.max(0, tier.maxSeats - FREE_SEATS_THRESHOLD);
      monthlyMaxCents = FLAT_FEE_CENTS + (maxPaidSeats * tier.pricePerPaidSeat);
    } else {
      monthlyMaxCents = 0; // Placeholder for Enterprise
    }

    return {
      label: tier.label,
      range:
        tier.maxSeats === null
          ? `${tier.minSeats}+ seats`
          : `${tier.minSeats}-${tier.maxSeats} seats`,
      pricePerPaidSeat: tier.pricePerPaidSeat === 0 
        ? "Free" 
        : formatPrice(tier.pricePerPaidSeat),
      monthlyMin: formatPrice(monthlyMinCents),
      monthlyMax: tier.maxSeats === null
        ? "Custom"
        : formatPrice(monthlyMaxCents),
      flatFee: formatPrice(FLAT_FEE_CENTS),
    };
  });
}

/**
 * Stripe Product and Price IDs
 * 
 * NOTE: You need to create these prices in Stripe Dashboard:
 * 1. BASE_FEE: A fixed recurring price of $19.99/month (quantity always 1)
 * 2. GROWTH: A metered/licensed price of $9.99 per unit (for seats 51-75)
 * 3. THRIVE: A metered/licensed price of $7.99 per unit (for seats 76-200)
 * 4. ENTERPRISE: A metered/licensed price of $5.99 per unit (for seats 201+)
 * 
 * The quantity for tiered prices should be (seats - 50) when seats > 50
 */
export const STRIPE_PRICE_IDS = {
  BASE_FEE: process.env.STRIPE_PRICE_ID_BASE_FEE!, // $19.99 Flat Fee (quantity: 1)
  GROWTH: process.env.STRIPE_PRICE_ID_GROWTH!, // $9.99/seat for seats 51-75
  THRIVE: process.env.STRIPE_PRICE_ID_THRIVE!, // $7.99/seat for seats 76-200
  ENTERPRISE: process.env.STRIPE_PRICE_ID_ENTERPRISE!, // $5.99/seat for seats 201+
} as const;

/**
 * Gets the appropriate Stripe Price IDs for a subscription
 * 
 * Returns an array of Price IDs: [BASE_FEE, TIERED_PRICE_ID]
 * The TIERED_PRICE_ID is only included if the church has more than 50 seats.
 * 
 * @param seats - Number of seats
 * @returns Array of Stripe Price IDs
 * 
 * @example
 * getStripePriceIds(25)  // [BASE_FEE]
 * getStripePriceIds(50)  // [BASE_FEE]
 * getStripePriceIds(60)  // [BASE_FEE, GROWTH]
 * getStripePriceIds(100) // [BASE_FEE, THRIVE]
 * getStripePriceIds(250) // [BASE_FEE, ENTERPRISE]
 */
export function getStripePriceIds(seats: number): string[] {
  const tier = getPricingTier(seats);
  const priceIds: string[] = [];
  
  // Always include the base fee
  priceIds.push(STRIPE_PRICE_IDS.BASE_FEE);

  // Calculate paid seats (seats above 50)
  const paidSeats = Math.max(0, seats - FREE_SEATS_THRESHOLD);

  // Only add the tiered price if there are paid seats (i.e., > 50 seats)
  if (paidSeats > 0) {
    let tierPriceId: string;
    
    switch (tier.label) {
      case "Growth":
        tierPriceId = STRIPE_PRICE_IDS.GROWTH;
        break;
      case "Thrive":
        tierPriceId = STRIPE_PRICE_IDS.THRIVE;
        break;
      case "Enterprise":
        tierPriceId = STRIPE_PRICE_IDS.ENTERPRISE;
        break;
      default:
        // Freemium tier - no additional price
        return priceIds;
    }
    
    priceIds.push(tierPriceId);
  }

  return priceIds;
}

/**
 * Gets the appropriate Stripe Price IDs and quantities for a subscription
 * 
 * Returns an array of subscription items for Stripe's API.
 * Always includes the base fee, plus the appropriate tiered price if applicable.
 * 
 * @param seats - Number of seats
 * @returns Array of subscription items with price ID and quantity
 * 
 * @example
 * getStripeSubscriptionItems(25)  // [{ price: BASE_FEE, quantity: 1 }]
 * getStripeSubscriptionItems(60)  // [{ price: BASE_FEE, quantity: 1 }, { price: GROWTH, quantity: 10 }]
 * getStripeSubscriptionItems(100) // [{ price: BASE_FEE, quantity: 1 }, { price: THRIVE, quantity: 50 }]
 */
export function getStripeSubscriptionItems(seats: number): Array<{ price: string; quantity: number }> {
  const tier = getPricingTier(seats);
  const items: Array<{ price: string; quantity: number }> = [];
  
  // Always include the base fee (quantity = 1)
  items.push({
    price: STRIPE_PRICE_IDS.BASE_FEE,
    quantity: 1,
  });

  // Calculate paid seats (seats above 50)
  const paidSeats = Math.max(0, seats - FREE_SEATS_THRESHOLD);

  // Only add the tiered price if there are paid seats
  if (paidSeats > 0) {
    let tierPriceId: string;
    
    switch (tier.label) {
      case "Growth":
        tierPriceId = STRIPE_PRICE_IDS.GROWTH;
        break;
      case "Thrive":
        tierPriceId = STRIPE_PRICE_IDS.THRIVE;
        break;
      case "Enterprise":
        tierPriceId = STRIPE_PRICE_IDS.ENTERPRISE;
        break;
      default:
        // Freemium tier - no additional price
        return items;
    }
    
    items.push({
      price: tierPriceId,
      quantity: paidSeats,
    });
  }

  return items;
}

/**
 * Webhook event types we handle
 */
export const STRIPE_WEBHOOK_EVENTS = {
  CHECKOUT_COMPLETED: "checkout.session.completed",
  SUBSCRIPTION_CREATED: "customer.subscription.created",
  SUBSCRIPTION_UPDATED: "customer.subscription.updated",
  SUBSCRIPTION_DELETED: "customer.subscription.deleted",
  INVOICE_PAID: "invoice.paid",
  INVOICE_PAYMENT_FAILED: "invoice.payment_failed",
} as const;
