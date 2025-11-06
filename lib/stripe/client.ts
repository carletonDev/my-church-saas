/**
 * Stripe Client Configuration
 * 
 * Initializes Stripe with the secret key for server-side operations
 * Used in Server Actions and API Routes
 */

import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
}

/**
 * Stripe client instance
 * Used for all server-side Stripe operations
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
  typescript: true,
  appInfo: {
    name: "Church SaaS Platform",
    version: "1.0.0",
  },
});
