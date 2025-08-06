-- Authentication System for Fleet Dashboard
-- This system implements role-based access control with user roles and RLS policies

-- Create user_roles table to manage user permissions
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('driver', 'manager', 'admin')),
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, role)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON public.user_roles(is_active);

-- Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles table
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
        )
    );

-- Function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.user_roles
    WHERE user_id = user_uuid AND is_active = true
    ORDER BY 
        CASE role 
            WHEN 'admin' THEN 1
            WHEN 'manager' THEN 2
            WHEN 'driver' THEN 3
        END
    LIMIT 1;
    
    RETURN COALESCE(user_role, 'driver'); -- Default to driver if no role found
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = user_uuid 
        AND role = required_role 
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION public.has_any_role(required_roles TEXT[], user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = user_uuid 
        AND role = ANY(required_roles)
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing RLS policies for tripsheets table
DROP POLICY IF EXISTS "tripsheets_driver_insert" ON public.tripsheets;
DROP POLICY IF EXISTS "tripsheets_driver_select" ON public.tripsheets;
DROP POLICY IF EXISTS "tripsheets_manager_select" ON public.tripsheets;

-- New RLS policies for tripsheets with role-based access
CREATE POLICY "tripsheets_driver_insert" ON public.tripsheets
    FOR INSERT WITH CHECK (
        auth.uid() = driver_id OR 
        public.has_role('manager') OR 
        public.has_role('admin')
    );

CREATE POLICY "tripsheets_driver_select" ON public.tripsheets
    FOR SELECT USING (
        auth.uid() = driver_id OR 
        public.has_role('manager') OR 
        public.has_role('admin')
    );

CREATE POLICY "tripsheets_driver_update" ON public.tripsheets
    FOR UPDATE USING (
        auth.uid() = driver_id OR 
        public.has_role('manager') OR 
        public.has_role('admin')
    );

CREATE POLICY "tripsheets_driver_delete" ON public.tripsheets
    FOR DELETE USING (
        public.has_role('manager') OR 
        public.has_role('admin')
    );

-- RLS policies for drivers table
CREATE POLICY "drivers_select_all" ON public.drivers
    FOR SELECT USING (true);

CREATE POLICY "drivers_manage_admin" ON public.drivers
    FOR ALL USING (
        public.has_role('manager') OR 
        public.has_role('admin')
    );

-- RLS policies for anomalies table (already exists, but let's enhance it)
DROP POLICY IF EXISTS "anomalies_select_all" ON public.anomalies;

CREATE POLICY "anomalies_select_all" ON public.anomalies
    FOR SELECT USING (
        public.has_role('manager') OR 
        public.has_role('admin')
    );

CREATE POLICY "anomalies_manage_admin" ON public.anomalies
    FOR ALL USING (public.has_role('admin'));

-- RLS policies for daily_driver_stats table
CREATE POLICY "daily_stats_select_all" ON public.daily_driver_stats
    FOR SELECT USING (
        public.has_role('manager') OR 
        public.has_role('admin')
    );

CREATE POLICY "daily_stats_manage_admin" ON public.daily_driver_stats
    FOR ALL USING (public.has_role('admin'));

-- Function to assign role to user (admin only)
CREATE OR REPLACE FUNCTION public.assign_user_role(
    target_user_id UUID,
    new_role TEXT,
    assigned_by_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if the assigning user is admin
    IF NOT public.has_role('admin', assigned_by_user_id) THEN
        RAISE EXCEPTION 'Only admins can assign roles';
    END IF;
    
    -- Insert or update the role
    INSERT INTO public.user_roles (user_id, role, assigned_by)
    VALUES (target_user_id, new_role, assigned_by_user_id)
    ON CONFLICT (user_id, role)
    DO UPDATE SET 
        assigned_by = assigned_by_user_id,
        assigned_at = NOW(),
        is_active = true;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove role from user (admin only)
CREATE OR REPLACE FUNCTION public.remove_user_role(
    target_user_id UUID,
    role_to_remove TEXT,
    removed_by_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if the removing user is admin
    IF NOT public.has_role('admin', removed_by_user_id) THEN
        RAISE EXCEPTION 'Only admins can remove roles';
    END IF;
    
    -- Deactivate the role
    UPDATE public.user_roles
    SET is_active = false
    WHERE user_id = target_user_id AND role = role_to_remove;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all users with their roles (admin only)
CREATE OR REPLACE FUNCTION public.get_users_with_roles()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    roles TEXT[],
    primary_role TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Check if the requesting user is admin
    IF NOT public.has_role('admin') THEN
        RAISE EXCEPTION 'Only admins can view all users';
    END IF;
    
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email,
        ARRAY_AGG(ur.role) as roles,
        public.get_user_role(u.id) as primary_role,
        u.created_at
    FROM auth.users u
    LEFT JOIN public.user_roles ur ON u.id = ur.user_id AND ur.is_active = true
    GROUP BY u.id, u.email, u.created_at
    ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to automatically assign driver role to new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically assign driver role to new users
    INSERT INTO public.user_roles (user_id, role, assigned_by)
    VALUES (NEW.id, 'driver', NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically assign role to new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function to get current user's profile with roles
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    roles TEXT[],
    primary_role TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email,
        ARRAY_AGG(ur.role) as roles,
        public.get_user_role(u.id) as primary_role,
        u.created_at
    FROM auth.users u
    LEFT JOIN public.user_roles ur ON u.id = ur.user_id AND ur.is_active = true
    WHERE u.id = auth.uid()
    GROUP BY u.id, u.email, u.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 