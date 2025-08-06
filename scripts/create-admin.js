// Script to create an admin user
// Run this in your Supabase SQL editor or via the Supabase CLI

-- Step 1: Create a user account (do this through your app's signup or Supabase dashboard)
-- Email: admin@fleet.com
-- Password: admin123456

-- Step 2: Assign admin role using the improved query
-- This query finds the user and assigns the admin role in one step

-- First, find the user ID and assign admin role
WITH admin_user AS (
    SELECT id FROM auth.users WHERE email = 'admin@fleet.com'
)
-- Then, insert the role for that user
INSERT INTO public.user_roles (user_id, role, assigned_by, assigned_at, is_active)
SELECT 
    id, 
    'admin', 
    id,  -- self-assigned 
    NOW(), 
    true 
FROM admin_user;

-- Step 3: Verify the admin role was assigned
SELECT 
    u.email,
    ur.role,
    ur.assigned_at,
    ur.is_active
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'admin@fleet.com';

-- Step 4: Check all users with their roles (admin only)
SELECT 
    u.email,
    ARRAY_AGG(ur.role) as roles,
    public.get_user_role(u.id) as primary_role
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id AND ur.is_active = true
GROUP BY u.id, u.email
ORDER BY u.created_at DESC; 