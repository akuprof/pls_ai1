// Verification script to check admin user setup
// Run these queries in your Supabase SQL editor

-- 1. Check if admin user exists
SELECT id, email, created_at, email_confirmed_at 
FROM auth.users 
WHERE email = 'admin@fleet.com';

-- 2. Check if admin role is assigned
SELECT 
    u.email,
    ur.role,
    ur.assigned_at,
    ur.is_active
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'admin@fleet.com';

-- 3. Check all users and their roles
SELECT 
    u.email,
    ARRAY_AGG(ur.role) as roles,
    public.get_user_role(u.id) as primary_role,
    u.created_at
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id AND ur.is_active = true
GROUP BY u.id, u.email, u.created_at
ORDER BY u.created_at DESC;

-- 4. Test the admin role functions
SELECT 
    'admin@fleet.com' as email,
    public.has_role('admin') as has_admin_role,
    public.has_role('manager') as has_manager_role,
    public.has_role('driver') as has_driver_role,
    public.get_user_role() as primary_role; 