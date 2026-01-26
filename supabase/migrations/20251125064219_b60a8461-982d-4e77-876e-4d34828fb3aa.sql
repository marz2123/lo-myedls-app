-- Function to safely add admin role to the current authenticated user
CREATE OR REPLACE FUNCTION add_current_user_as_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add admin role to the current user if not already admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION add_current_user_as_admin() TO authenticated;

COMMENT ON FUNCTION add_current_user_as_admin() IS 'Allows the current authenticated user to add themselves as admin - should be called once by app creator';