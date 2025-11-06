/**
 * Subscription Management Server Actions
 * 
 * Handles subscription creation, updates, and cancellation.
 * Integrates with Stripe for payment processing using hybrid pricing model:
 * - Flat fee of $19.99/month for all churches
 * - First 50 seats free
 * - Tiered pricing for seats 51+
 */

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/client";
import { 
  getStripeSubscriptionItems, 
  calculateTotalCost,
  FREE_SEATS_THRESHOLD,
  FLAT_FEE_CENTS 
} from "@/lib/stripe/config";
import type { ActionResponse } from "@/types";

/**
 * Creates a Stripe Checkout session for a new subscription
 * 
 * @param seats - Number of seats to purchase
 * @returns Action response with checkout URL
 */
export async function createCheckoutSession(
  seats: number
): Promise<ActionResponse<{ url: string }>> {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Get current user's data
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { organization: { include: { subscription: true } } },
    });

    if (!dbUser) {
      return { success: false, error: "User not found" };
    }

    // Check if user is OWNER
    if (dbUser.role !== "OWNER") {
      return {
        success: false,
        error: "Only owners can manage subscriptions",
      };
    }

    // Check if organization already has a subscription
    if (dbUser.organization.subscription) {
      return {
        success: false,
        error: "Organization already has an active subscription",
      };
    }

    // Validate seats
    if (seats < 1) {
      return { success: false, error: "Must have at least 1 seat" };
    }

    // Get the subscription items (base fee + tiered pricing)
    const subscriptionItems = getStripeSubscriptionItems(seats);

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: subscriptionItems.map(item => ({
        price: item.price,
        quantity: item.quantity,
      })),
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription?canceled=true`,
      customer_email: dbUser.email,
      metadata: {
        organizationId: dbUser.organizationId,
        userId: dbUser.id,
        totalSeats: seats.toString(),
      },
      subscription_data: {
        metadata: {
          organizationId: dbUser.organizationId,
          totalSeats: seats.toString(),
        },
      },
    });

    if (!session.url) {
      return { success: false, error: "Failed to create checkout session" };
    }

    return { success: true, data: { url: session.url } };
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return {
      success: false,
      error: "Failed to create checkout session. Please try again.",
    };
  }
}

/**
 * Creates a Stripe Customer Portal session for managing subscription
 * 
 * @returns Action response with portal URL
 */
export async function createPortalSession(): Promise<
  ActionResponse<{ url: string }>
> {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Get current user's data
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { organization: { include: { subscription: true } } },
    });

    if (!dbUser) {
      return { success: false, error: "User not found" };
    }

    // Check if user is OWNER
    if (dbUser.role !== "OWNER") {
      return {
        success: false,
        error: "Only owners can manage subscriptions",
      };
    }

    // Check if organization has a subscription
    if (!dbUser.organization.subscription) {
      return { success: false, error: "No active subscription found" };
    }

    // Create Stripe Customer Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: dbUser.organization.subscription.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription`,
    });

    return { success: true, data: { url: session.url } };
  } catch (error) {
    console.error("Error creating portal session:", error);
    return {
      success: false,
      error: "Failed to create portal session. Please try again.",
    };
  }
}

/**
 * Cancels the subscription at the end of the billing period
 * 
 * @returns Action response
 */
export async function cancelSubscription(): Promise<ActionResponse> {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Get current user's data
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { organization: { include: { subscription: true } } },
    });

    if (!dbUser) {
      return { success: false, error: "User not found" };
    }

    // Check if user is OWNER
    if (dbUser.role !== "OWNER") {
      return {
        success: false,
        error: "Only owners can manage subscriptions",
      };
    }

    // Check if organization has a subscription
    if (!dbUser.organization.subscription) {
      return { success: false, error: "No active subscription found" };
    }

    // Cancel subscription at period end
    await stripe.subscriptions.update(
      dbUser.organization.subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: true,
      }
    );

    // Update database
    await prisma.subscription.update({
      where: { id: dbUser.organization.subscription.id },
      data: {
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
      },
    });

    revalidatePath("/dashboard/subscription");
    return { success: true };
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return {
      success: false,
      error: "Failed to cancel subscription. Please try again.",
    };
  }
}

/**
 * Reactivates a canceled subscription
 * 
 * @returns Action response
 */
export async function reactivateSubscription(): Promise<ActionResponse> {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Get current user's data
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { organization: { include: { subscription: true } } },
    });

    if (!dbUser) {
      return { success: false, error: "User not found" };
    }

    // Check if user is OWNER
    if (dbUser.role !== "OWNER") {
      return {
        success: false,
        error: "Only owners can manage subscriptions",
      };
    }

    // Check if organization has a subscription
    if (!dbUser.organization.subscription) {
      return { success: false, error: "No active subscription found" };
    }

    // Check if subscription is set to cancel
    if (!dbUser.organization.subscription.cancelAtPeriodEnd) {
      return { success: false, error: "Subscription is not set to cancel" };
    }

    // Reactivate subscription
    await stripe.subscriptions.update(
      dbUser.organization.subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: false,
      }
    );

    // Update database
    await prisma.subscription.update({
      where: { id: dbUser.organization.subscription.id },
      data: {
        cancelAtPeriodEnd: false,
        canceledAt: null,
      },
    });

    revalidatePath("/dashboard/subscription");
    return { success: true };
  } catch (error) {
    console.error("Error reactivating subscription:", error);
    return {
      success: false,
      error: "Failed to reactivate subscription. Please try again.",
    };
  }
}

/**
 * Gets the current subscription details with hybrid pricing breakdown
 * 
 * @returns Action response with subscription data
 */
export async function getSubscriptionDetails(): Promise<
  ActionResponse<{
    subscription: {
      status: string;
      totalSeats: number;
      freeSeats: number;
      paidSeats: number;
      flatFee: number;
      variableCost: number;
      totalCost: number;
      currentPeriodEnd: Date;
      cancelAtPeriodEnd: boolean;
    } | null;
  }>
> {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Get current user's data
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { organization: { include: { subscription: true } } },
    });

    if (!dbUser) {
      return { success: false, error: "User not found" };
    }

    if (!dbUser.organization.subscription) {
      return { success: true, data: { subscription: null } };
    }

    const sub = dbUser.organization.subscription;
    const totalSeats = sub.quantity;
    const freeSeats = Math.min(totalSeats, FREE_SEATS_THRESHOLD);
    const paidSeats = Math.max(0, totalSeats - FREE_SEATS_THRESHOLD);
    const totalCost = calculateTotalCost(totalSeats);
    const variableCost = totalCost - FLAT_FEE_CENTS;

    return {
      success: true,
      data: {
        subscription: {
          status: sub.status,
          totalSeats,
          freeSeats,
          paidSeats,
          flatFee: FLAT_FEE_CENTS,
          variableCost,
          totalCost,
          currentPeriodEnd: sub.stripeCurrentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return {
      success: false,
      error: "Failed to fetch subscription details. Please try again.",
    };
  }
}
