/**
 * Stripe Webhook Handler
 * 
 * Handles Stripe webhook events for subscription management using hybrid pricing:
 * - Base fee: $19.99/month (always charged, quantity: 1)
 * - First 50 seats: Free
 * - Tiered pricing for seats 51+ (dynamic quantity based on paid seats)
 * 
 * Important: Webhook Secret must be configured in Stripe Dashboard
 * Endpoint URL: https://your-domain.com/api/webhooks/stripe
 * 
 * Events handled:
 * - checkout.session.completed - Initial subscription creation
 * - customer.subscription.created - Subscription created
 * - customer.subscription.updated - Subscription updated (quantity, price, etc.)
 * - customer.subscription.deleted - Subscription canceled
 * - invoice.paid - Successful payment
 * - invoice.payment_failed - Failed payment
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/client";
import { STRIPE_WEBHOOK_EVENTS, STRIPE_PRICE_IDS } from "@/lib/stripe/config";
import { SubscriptionStatus } from "@prisma/client";

/**
 * Extended Stripe Invoice type with subscription property
 */
interface StripeInvoiceWithSubscription extends Stripe.Invoice {
  subscription?: string | Stripe.Subscription | null;
}

/**
 * Extended Stripe Subscription type with all required properties
 */
interface StripeSubscriptionComplete extends Stripe.Subscription {
  current_period_end: number;
  status: Stripe.Subscription.Status;
  cancel_at_period_end: boolean;
}

/**
 * POST handler for Stripe webhooks
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    console.error("No Stripe signature found");
    return NextResponse.json(
      { error: "No signature found" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    // Handle the event
    switch (event.type) {
      case STRIPE_WEBHOOK_EVENTS.CHECKOUT_COMPLETED:
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case STRIPE_WEBHOOK_EVENTS.SUBSCRIPTION_CREATED:
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case STRIPE_WEBHOOK_EVENTS.SUBSCRIPTION_UPDATED:
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case STRIPE_WEBHOOK_EVENTS.SUBSCRIPTION_DELETED:
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case STRIPE_WEBHOOK_EVENTS.INVOICE_PAID:
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case STRIPE_WEBHOOK_EVENTS.INVOICE_PAYMENT_FAILED:
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

/**
 * Handles successful checkout completion
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log("Processing checkout.session.completed:", session.id);

  const organizationId = session.metadata?.organizationId;
  if (!organizationId) {
    console.error("No organizationId in session metadata");
    return;
  }

  // Get the subscription
  const subscriptionId = session.subscription as string;
  if (!subscriptionId) {
    console.error("No subscription in checkout session");
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId) as unknown as StripeSubscriptionComplete;

  // Create or update subscription in database
  await upsertSubscription(organizationId, subscription);
}

/**
 * Handles subscription creation
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log("Processing customer.subscription.created:", subscription.id);

  const organizationId = subscription.metadata?.organizationId;
  if (!organizationId) {
    console.error("No organizationId in subscription metadata");
    return;
  }

  await upsertSubscription(organizationId, subscription as unknown as StripeSubscriptionComplete);
}

/**
 * Handles subscription updates (quantity, price tier, etc.)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log("Processing customer.subscription.updated:", subscription.id);

  const organizationId = subscription.metadata?.organizationId;
  if (!organizationId) {
    console.error("No organizationId in subscription metadata");
    return;
  }

  await upsertSubscription(organizationId, subscription as unknown as StripeSubscriptionComplete);
}

/**
 * Handles subscription deletion/cancellation
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("Processing customer.subscription.deleted:", subscription.id);

  // Find subscription in database
  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!dbSubscription) {
    console.error("Subscription not found in database:", subscription.id);
    return;
  }

  // Update subscription status
  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      status: SubscriptionStatus.CANCELED,
      canceledAt: new Date(),
    },
  });

  console.log("Subscription deleted:", subscription.id);
}

/**
 * Handles successful invoice payment
 */
async function handleInvoicePaid(invoice: StripeInvoiceWithSubscription) {
  console.log("Processing invoice.paid:", invoice.id);

  // Handle subscription property which can be string | Subscription | null
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id;

  if (!subscriptionId) {
    return;
  }

  // Find subscription in database
  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!dbSubscription) {
    console.error("Subscription not found in database:", subscriptionId);
    return;
  }

  // Update subscription to active if it was past due
  if (dbSubscription.status === SubscriptionStatus.PAST_DUE) {
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: { status: SubscriptionStatus.ACTIVE },
    });
  }

  console.log("Invoice paid for subscription:", subscriptionId);
}

/**
 * Handles failed invoice payment
 */
async function handleInvoicePaymentFailed(invoice: StripeInvoiceWithSubscription) {
  console.log("Processing invoice.payment_failed:", invoice.id);

  // Handle subscription property which can be string | Subscription | null
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id;

  if (!subscriptionId) {
    return;
  }

  // Find subscription in database
  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!dbSubscription) {
    console.error("Subscription not found in database:", subscriptionId);
    return;
  }

  // Update subscription status to past due
  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: { status: SubscriptionStatus.PAST_DUE },
  });

  // TODO: Send email notification to organization owner
  console.log("Payment failed for subscription:", subscriptionId);
}

/**
 * Helper function to upsert subscription data
 * Handles hybrid pricing model with base fee + tiered pricing
 */
async function upsertSubscription(
  organizationId: string,
  subscription: StripeSubscriptionComplete
) {
  // Extract total seats from metadata (stored during checkout/updates)
  const totalSeats = parseInt(subscription.metadata?.totalSeats || "1", 10);

  // Find the base fee item and tier price item
  const baseFeeItem = subscription.items.data.find(
    (item) => item.price.id === STRIPE_PRICE_IDS.BASE_FEE
  );

  // Find the tier price item (if any - may not exist for Freemium tier)
  const tierItem = subscription.items.data.find(
    (item) => item.price.id !== STRIPE_PRICE_IDS.BASE_FEE
  );

  // Use the tier price ID if it exists, otherwise use base fee
  const stripePriceId = tierItem?.price.id || baseFeeItem?.price.id || subscription.items.data[0]?.price.id;

  const subscriptionData = {
    stripeCustomerId: subscription.customer as string,
    stripeSubscriptionId: subscription.id,
    stripePriceId: stripePriceId,
    stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
    status: mapStripeStatus(subscription.status),
    quantity: totalSeats, // Store total seats (including free 50)
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialEnd: subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : null,
  };

  // Try to find existing subscription
  const existingSubscription = await prisma.subscription.findUnique({
    where: { organizationId },
  });

  if (existingSubscription) {
    // Update existing subscription
    await prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: subscriptionData,
    });
    console.log("Subscription updated:", subscription.id);
  } else {
    // Create new subscription
    await prisma.subscription.create({
      data: {
        ...subscriptionData,
        organizationId,
      },
    });
    console.log("Subscription created:", subscription.id);
  }

  // Update organization max members based on total seats
  await prisma.organization.update({
    where: { id: organizationId },
    data: { maxMembers: totalSeats },
  });
}

/**
 * Maps Stripe subscription status to our database enum
 */
function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
  const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
    incomplete: SubscriptionStatus.INCOMPLETE,
    incomplete_expired: SubscriptionStatus.INCOMPLETE_EXPIRED,
    trialing: SubscriptionStatus.TRIALING,
    active: SubscriptionStatus.ACTIVE,
    past_due: SubscriptionStatus.PAST_DUE,
    canceled: SubscriptionStatus.CANCELED,
    unpaid: SubscriptionStatus.UNPAID,
    paused: SubscriptionStatus.PAST_DUE, // Map paused to past_due
  };

  return statusMap[stripeStatus] || SubscriptionStatus.INCOMPLETE;
}
