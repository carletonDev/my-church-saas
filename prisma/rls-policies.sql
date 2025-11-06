-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR CHURCH SAAS PLATFORM
-- ============================================================================
-- This file contains all RLS policies to secure your Supabase database.
-- Run this SQL in your Supabase SQL Editor after running Prisma migrations.
--
-- Security Model:
-- 1. Users can only access data within their organization
-- 2. OWNER role has full control within their organization
-- 3. ADMIN role can manage users and discussions
-- 4. MEMBER role has read access and can create messages
-- ============================================================================

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================
-- Note: We use auth.uid() which is Supabase's built-in function
-- It returns the UUID of the authenticated user from the JWT token

-- Function to get the current user's organization ID
CREATE OR REPLACE FUNCTION public.get_user_organization_id(user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM users WHERE id = user_id LIMIT 1;
$$;

-- Function to get the current user's role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM users WHERE id = user_id LIMIT 1;
$$;

-- Function to check if user is OWNER or ADMIN
CREATE OR REPLACE FUNCTION public.is_admin_or_owner(user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = user_id 
    AND role IN ('OWNER', 'ADMIN')
  );
$$;

-- Function to check if user is OWNER
CREATE OR REPLACE FUNCTION public.is_owner(user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = user_id 
    AND role = 'OWNER'
  );
$$;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can view all users in their organization
CREATE POLICY "Users can view users in their organization"
ON users
FOR SELECT
USING (
  organization_id = public.get_user_organization_id(auth.uid())
);

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON users
FOR SELECT
USING (
  id = auth.uid()
);

-- Users can update their own profile (name only, not role or organization)
CREATE POLICY "Users can update their own profile"
ON users
FOR UPDATE
USING (
  id = auth.uid()
)
WITH CHECK (
  id = auth.uid()
  AND organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  AND role = (SELECT role FROM users WHERE id = auth.uid())
);

-- Only OWNER can insert new users into their organization
CREATE POLICY "Owners can add users to their organization"
ON users
FOR INSERT
WITH CHECK (
  public.is_owner(auth.uid())
  AND organization_id = public.get_user_organization_id(auth.uid())
);

-- Only OWNER can delete users from their organization
CREATE POLICY "Owners can remove users from their organization"
ON users
FOR DELETE
USING (
  public.is_owner(auth.uid())
  AND organization_id = public.get_user_organization_id(auth.uid())
  AND id != auth.uid() -- Cannot delete yourself
);

-- OWNER and ADMIN can update user roles within their organization
CREATE POLICY "Admins can update users in their organization"
ON users
FOR UPDATE
USING (
  public.is_admin_or_owner(auth.uid())
  AND organization_id = public.get_user_organization_id(auth.uid())
  AND id != auth.uid() -- Cannot modify your own role
)
WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
);

-- ============================================================================
-- ORGANIZATIONS TABLE POLICIES
-- ============================================================================

-- Users can view their own organization
CREATE POLICY "Users can view their organization"
ON organizations
FOR SELECT
USING (
  id = public.get_user_organization_id(auth.uid())
);

-- Only OWNER can update organization details
CREATE POLICY "Owners can update their organization"
ON organizations
FOR UPDATE
USING (
  public.is_owner(auth.uid())
  AND id = public.get_user_organization_id(auth.uid())
)
WITH CHECK (
  id = public.get_user_organization_id(auth.uid())
);

-- Service role can insert organizations (for signup flow via Server Actions)
CREATE POLICY "Service role can create organizations"
ON organizations
FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow authenticated users to create organizations during signup
-- This policy should be refined based on your signup flow
CREATE POLICY "Authenticated users can create organizations during signup"
ON organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only OWNER can delete their organization (dangerous operation)
CREATE POLICY "Owners can delete their organization"
ON organizations
FOR DELETE
USING (
  public.is_owner(auth.uid())
  AND id = public.get_user_organization_id(auth.uid())
);

-- ============================================================================
-- SUBSCRIPTIONS TABLE POLICIES
-- ============================================================================

-- Users can view their organization's subscription
CREATE POLICY "Users can view their organization subscription"
ON subscriptions
FOR SELECT
USING (
  organization_id = public.get_user_organization_id(auth.uid())
);

-- Only OWNER can update subscription (typically done via Stripe webhook)
CREATE POLICY "Owners can manage subscription"
ON subscriptions
FOR UPDATE
USING (
  public.is_owner(auth.uid())
  AND organization_id = public.get_user_organization_id(auth.uid())
)
WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
);

-- Service role can manage subscriptions (for webhooks and initial setup)
CREATE POLICY "Service role can manage subscriptions"
ON subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- DISCUSSIONS TABLE POLICIES
-- ============================================================================

-- Users can view discussions in their organization
CREATE POLICY "Users can view discussions in their organization"
ON discussions
FOR SELECT
USING (
  organization_id = public.get_user_organization_id(auth.uid())
);

-- ADMIN and OWNER can create discussions
CREATE POLICY "Admins can create discussions"
ON discussions
FOR INSERT
WITH CHECK (
  public.is_admin_or_owner(auth.uid())
  AND organization_id = public.get_user_organization_id(auth.uid())
);

-- ADMIN and OWNER can update discussions
CREATE POLICY "Admins can update discussions"
ON discussions
FOR UPDATE
USING (
  public.is_admin_or_owner(auth.uid())
  AND organization_id = public.get_user_organization_id(auth.uid())
)
WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
);

-- ADMIN and OWNER can delete discussions
CREATE POLICY "Admins can delete discussions"
ON discussions
FOR DELETE
USING (
  public.is_admin_or_owner(auth.uid())
  AND organization_id = public.get_user_organization_id(auth.uid())
);

-- ============================================================================
-- MESSAGES TABLE POLICIES
-- ============================================================================

-- Users can view messages in discussions within their organization
CREATE POLICY "Users can view messages in their organization"
ON messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM discussions d
    WHERE d.id = messages.discussion_id
    AND d.organization_id = public.get_user_organization_id(auth.uid())
  )
);

-- Users can create messages in discussions within their organization
-- Only if the discussion is active and not locked
CREATE POLICY "Users can create messages in active discussions"
ON messages
FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM discussions d
    WHERE d.id = messages.discussion_id
    AND d.organization_id = public.get_user_organization_id(auth.uid())
    AND d.is_active = true
    AND d.is_locked = false
  )
);

-- Users can update their own messages (for editing)
CREATE POLICY "Users can update their own messages"
ON messages
FOR UPDATE
USING (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM discussions d
    WHERE d.id = messages.discussion_id
    AND d.organization_id = public.get_user_organization_id(auth.uid())
  )
)
WITH CHECK (
  author_id = auth.uid()
  AND discussion_id = (SELECT discussion_id FROM messages WHERE id = messages.id)
);

-- Users can soft-delete their own messages
-- ADMIN and OWNER can delete any message in their organization
CREATE POLICY "Users can delete their own messages or admins can delete any"
ON messages
FOR UPDATE
USING (
  (
    -- User deleting their own message
    author_id = auth.uid()
    OR 
    -- Admin/Owner deleting any message in their org
    (
      public.is_admin_or_owner(auth.uid())
      AND EXISTS (
        SELECT 1 FROM discussions d
        WHERE d.id = messages.discussion_id
        AND d.organization_id = public.get_user_organization_id(auth.uid())
      )
    )
  )
  AND EXISTS (
    SELECT 1 FROM discussions d
    WHERE d.id = messages.discussion_id
    AND d.organization_id = public.get_user_organization_id(auth.uid())
  )
);

-- ============================================================================
-- REALTIME PUBLICATION
-- ============================================================================
-- Enable Realtime for the messages table so clients can subscribe to changes

-- Check if publication exists and drop it
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    DROP PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Create publication for Realtime
CREATE PUBLICATION supabase_realtime FOR TABLE messages;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
-- These indexes improve RLS policy performance
-- Note: Many of these are already created by Prisma migrations

-- Index for organization lookups
CREATE INDEX IF NOT EXISTS idx_users_organization_id_rls ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_id_organization_id_rls ON users(id, organization_id);
CREATE INDEX IF NOT EXISTS idx_users_role_rls ON users(role);

-- Index for discussion organization lookups
CREATE INDEX IF NOT EXISTS idx_discussions_organization_id_rls ON discussions(organization_id);
CREATE INDEX IF NOT EXISTS idx_discussions_org_active_rls ON discussions(organization_id, is_active);

-- ============================================================================
-- GRANTS
-- ============================================================================
-- Grant necessary permissions to authenticated and anon users

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Grant sequence permissions (for auto-increment IDs if needed)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- ============================================================================
-- VERIFY RLS IS ENABLED
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'organizations', 'subscriptions', 'discussions', 'messages')
ORDER BY tablename;
