/**
 * Type Definitions
 * 
 * Shared TypeScript types and interfaces used throughout the application
 */

import { User, Organization, Subscription, Discussion, Message } from "@prisma/client";

/**
 * Supabase Database Types
 * This is a placeholder - generate real types with: npx supabase gen types typescript --local
 */
export type Database = {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, "createdAt" | "updatedAt">;
        Update: Partial<Omit<User, "id" | "createdAt">>;
      };
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, "id" | "createdAt" | "updatedAt">;
        Update: Partial<Omit<Organization, "id" | "createdAt">>;
      };
      subscriptions: {
        Row: Subscription;
        Insert: Omit<Subscription, "id" | "createdAt" | "updatedAt">;
        Update: Partial<Omit<Subscription, "id" | "createdAt">>;
      };
      discussions: {
        Row: Discussion;
        Insert: Omit<Discussion, "id" | "createdAt" | "updatedAt">;
        Update: Partial<Omit<Discussion, "id" | "createdAt">>;
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, "id" | "createdAt" | "updatedAt">;
        Update: Partial<Omit<Message, "id" | "createdAt">>;
      };
    };
  };
};

/**
 * Extended types with relations
 */
export type UserWithOrganization = User & {
  organization: Organization;
};

export type OrganizationWithUsers = Organization & {
  users: User[];
  subscription: Subscription | null;
};

export type DiscussionWithMessages = Discussion & {
  messages: Message[];
  organization: Organization;
};

export type MessageWithAuthor = Message & {
  author: User;
  discussion: Discussion;
  replies?: MessageWithAuthor[];
  parentMessage?: MessageWithAuthor | null;
};

export type SubscriptionWithOrganization = Subscription & {
  organization: Organization;
};

/**
 * Server Action Response Types
 */
export type ActionResponse<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * User Role Permissions
 */
export type UserPermissions = {
  canManageUsers: boolean;
  canManageSubscription: boolean;
  canCreateDiscussions: boolean;
  canDeleteMessages: boolean;
  canManageOrganization: boolean;
};

/**
 * Stripe-related types
 */
export type SubscriptionTier = "STARTER" | "GROWTH" | "PROFESSIONAL" | "ENTERPRISE";

export type BillingInfo = {
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  status: string;
  quantity: number;
  pricePerSeat: number;
  totalCost: number;
  tier: SubscriptionTier;
};
