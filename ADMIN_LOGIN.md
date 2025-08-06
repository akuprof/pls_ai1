# Admin Login Guide

## 🚀 Quick Admin Setup

### Option 1: Create Admin User Through App

1. **Sign up as a new user**:
   - Go to your app at http://localhost:3000
   - Click "Don't have an account? Sign up"
   - Use email: `admin@fleet.com`
   - Use password: `admin123456`

2. **Assign admin role** (in Supabase SQL Editor):
   ```sql
   -- Find your user ID
   SELECT id, email FROM auth.users WHERE email = 'admin@fleet.com';
   
   -- Assign admin role (replace USER_ID with actual ID)
   INSERT INTO public.user_roles (user_id, role, assigned_by, assigned_at, is_active)
   VALUES (
       'USER_ID', -- Replace with actual user ID
       'admin',
       'USER_ID', -- Same user ID
       NOW(),
       true
   );
   ```

### Option 2: Create Admin User Directly in Supabase

1. **Go to Supabase Dashboard**:
   - Navigate to Authentication > Users
   - Click "Add User"
   - Email: `admin@fleet.com`
   - Password: `admin123456`

2. **Assign admin role** (same SQL as above)

## 🔐 Admin Login

Once you have an admin user set up:

1. **Go to your app**: http://localhost:3000
2. **Sign in** with admin credentials:
   - Email: `admin@fleet.com`
   - Password: `admin123456`
3. **You'll have access to**:
   - Dashboard (Manager/Admin only)
   - Reports (Manager/Admin only)
   - Audit (Manager/Admin only)
   - All trip entry features

## 👥 Role-Based Access

### Admin Permissions:
- ✅ View all trips and data
- ✅ Manage user roles
- ✅ Access audit logs
- ✅ Generate reports
- ✅ Full system access

### Manager Permissions:
- ✅ View all trips and data
- ✅ Generate reports
- ✅ Access audit logs
- ❌ Cannot manage user roles

### Driver Permissions:
- ✅ Enter trip data
- ✅ View own trips
- ✅ Use chatbot
- ❌ Cannot view other drivers' data
- ❌ Cannot access reports or audit

## 🛠️ Troubleshooting

### If login doesn't work:
1. Check if user exists in Supabase Auth
2. Verify admin role is assigned in `user_roles` table
3. Check browser console for errors
4. Ensure Supabase connection is working

### To verify admin role:
```sql
SELECT 
    u.email,
    ur.role,
    ur.is_active
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'admin@fleet.com';
```

## 🔧 Development Admin Credentials

For development, you can use:
- **Email**: `admin@fleet.com`
- **Password**: `admin123456`

Remember to change these credentials for production! 