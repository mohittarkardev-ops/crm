-- =====================================================================
-- CRM Integration - Phase 1: Database Schema Extension
-- Date: 2026-11-08
-- Purpose: Extend SecureDrive schema to support Insurance Manager features
-- =====================================================================

-- ===========================================
-- 1. EXTEND staff_users FOR EMPLOYEE MANAGEMENT
-- ===========================================

-- Add employee-specific fields to staff_users
ALTER TABLE public.staff_users
  ADD COLUMN IF NOT EXISTS employee_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS mobile_number text,
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Update role check constraint to include 'superadmin'
ALTER TABLE public.staff_users DROP CONSTRAINT IF EXISTS staff_users_role_check;
ALTER TABLE public.staff_users
  ADD CONSTRAINT staff_users_role_check
  CHECK (role IN ('superadmin', 'admin', 'staff'));

-- Add index for employee code lookup
CREATE INDEX IF NOT EXISTS idx_staff_users_employee_code ON public.staff_users(employee_code);
CREATE INDEX IF NOT EXISTS idx_staff_users_mobile ON public.staff_users(mobile_number);

-- Add updated_at trigger for staff_users
CREATE OR REPLACE FUNCTION public.update_staff_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS staff_users_updated_at ON public.staff_users;
CREATE TRIGGER staff_users_updated_at
  BEFORE UPDATE ON public.staff_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_staff_users_updated_at();

COMMENT ON COLUMN public.staff_users.employee_code IS 'Unique employee identifier code (e.g., EMP-001)';
COMMENT ON COLUMN public.staff_users.designation IS 'Job title or designation (e.g., Sales Agent, Manager)';
COMMENT ON COLUMN public.staff_users.is_active IS 'Whether the employee is currently active';


-- ===========================================
-- 2. EXTEND policies FOR VEHICLE INSURANCE
-- ===========================================

-- Add vehicle category and Insurance Manager specific fields
ALTER TABLE public.policies
  ADD COLUMN IF NOT EXISTS vehicle_category text DEFAULT 'other' CHECK (vehicle_category IN ('2W', '4W', 'CV', 'bike', 'car', 'other')),
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS permanent_address text,
  ADD COLUMN IF NOT EXISTS saod_due_date date,
  ADD COLUMN IF NOT EXISTS tp_due_date date,
  ADD COLUMN IF NOT EXISTS seating_capacity text,
  ADD COLUMN IF NOT EXISTS rto_location text,
  ADD COLUMN IF NOT EXISTS pin text,
  ADD COLUMN IF NOT EXISTS pin2 text,
  ADD COLUMN IF NOT EXISTS idv numeric,
  ADD COLUMN IF NOT EXISTS insurance_company_name text;

-- Add indexes for high-performance search (trigram indexes for fuzzy search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_policies_owner_name_trgm ON public.policies
  USING gin (lower(owner_name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_policies_vehicle_reg_trgm ON public.policies
  USING gin (lower(vehicle_reg_no) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_policies_holder_mobile ON public.policies(holder_mobile);
CREATE INDEX IF NOT EXISTS idx_policies_vehicle_category ON public.policies(vehicle_category);
CREATE INDEX IF NOT EXISTS idx_policies_saod_due_date ON public.policies(saod_due_date);
CREATE INDEX IF NOT EXISTS idx_policies_tp_due_date ON public.policies(tp_due_date);

COMMENT ON COLUMN public.policies.vehicle_category IS 'Vehicle category: 2W (two-wheeler), 4W (four-wheeler), CV (commercial vehicle), bike, car, other';
COMMENT ON COLUMN public.policies.owner_name IS 'Vehicle owner name (may differ from policy holder)';
COMMENT ON COLUMN public.policies.saod_due_date IS 'SAOD (Stand Alone Own Damage) policy due date';
COMMENT ON COLUMN public.policies.tp_due_date IS 'TP (Third Party) policy due date';
COMMENT ON COLUMN public.policies.rto_location IS 'RTO (Regional Transport Office) location - primarily for 4W';
COMMENT ON COLUMN public.policies.pin IS 'PIN code 1 - primarily for 2W';
COMMENT ON COLUMN public.policies.pin2 IS 'PIN code 2 - primarily for 2W';
COMMENT ON COLUMN public.policies.idv IS 'Insured Declared Value';


-- ===========================================
-- 3. CREATE claims TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS public.claims (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Agent/Employee Details
  staff_id uuid REFERENCES public.staff_users(id) ON DELETE SET NULL,
  employee_name text NOT NULL, -- Kept for backward compatibility and public form

  -- Target Vehicle
  vehicle_reg_no text NOT NULL,
  policy_id uuid REFERENCES public.policies(id) ON DELETE SET NULL,

  -- Payment Details
  payment_date date NOT NULL,
  payment_mode text NOT NULL CHECK (payment_mode IN ('Online', 'NEFT', 'Cheque', 'GPay', 'UPI', 'Cash')),
  payment_amount numeric,
  remarks text,

  -- Unknown Vehicle Context (filled if policy_id is null)
  customer_name text,
  customer_mobile text,
  saod_due_date date,

  -- Business Logic Status
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,

  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.staff_users(id) ON DELETE SET NULL
);

-- Add indexes for claims
CREATE INDEX IF NOT EXISTS idx_claims_staff_id ON public.claims(staff_id);
CREATE INDEX IF NOT EXISTS idx_claims_policy_id ON public.claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_claims_vehicle_reg ON public.claims(vehicle_reg_no);
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_payment_date ON public.claims(payment_date);
CREATE INDEX IF NOT EXISTS idx_claims_created_at ON public.claims(created_at DESC);

-- Add updated_at trigger for claims
DROP TRIGGER IF EXISTS claims_updated_at ON public.claims;
CREATE TRIGGER claims_updated_at
  BEFORE UPDATE ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.update_staff_users_updated_at();

COMMENT ON TABLE public.claims IS 'Insurance claims and conversion tracking system';
COMMENT ON COLUMN public.claims.staff_id IS 'Staff/agent who submitted the claim';
COMMENT ON COLUMN public.claims.employee_name IS 'Agent name (for public form submission)';
COMMENT ON COLUMN public.claims.policy_id IS 'Links to existing policy if vehicle is known';
COMMENT ON COLUMN public.claims.status IS 'Claim approval status: pending, approved, rejected';


-- ===========================================
-- 4. CREATE grid_columns TABLE (Dynamic Column Configuration)
-- ===========================================

CREATE TABLE IF NOT EXISTS public.grid_columns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  accessor_key text UNIQUE NOT NULL,
  header_label text NOT NULL,
  data_type text NOT NULL CHECK (data_type IN ('text', 'number', 'date', 'boolean', 'json')),
  is_visible boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add index for grid_columns
CREATE INDEX IF NOT EXISTS idx_grid_columns_visible ON public.grid_columns(is_visible);
CREATE INDEX IF NOT EXISTS idx_grid_columns_sort_order ON public.grid_columns(sort_order);

COMMENT ON TABLE public.grid_columns IS 'Dynamic column configuration for data grid (Airtable-style)';
COMMENT ON COLUMN public.grid_columns.accessor_key IS 'Unique column identifier key';
COMMENT ON COLUMN public.grid_columns.header_label IS 'Display label for column header';
COMMENT ON COLUMN public.grid_columns.is_visible IS 'Whether column is visible by default';


-- ===========================================
-- 5. UPDATE audit_logs TO TRACK ALL ENTITIES
-- ===========================================

-- Extend audit_logs to handle new entities
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS changes jsonb,
  ADD COLUMN IF NOT EXISTS ip_address inet,
  ADD COLUMN IF NOT EXISTS user_agent text;

-- Add index for better audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_staff_id ON public.audit_logs(staff_id);

COMMENT ON COLUMN public.audit_logs.changes IS 'JSON object containing before/after values';
COMMENT ON COLUMN public.audit_logs.ip_address IS 'IP address of the user performing the action';
COMMENT ON COLUMN public.audit_logs.user_agent IS 'User agent string of the client';


-- ===========================================
-- 6. CREATE HELPER FUNCTIONS
-- ===========================================

-- Function to auto-generate employee codes
CREATE OR REPLACE FUNCTION public.generate_employee_code()
RETURNS text AS $$
DECLARE
  max_code integer;
  new_code text;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(employee_code FROM 5) AS integer)), 0) + 1
  INTO max_code
  FROM public.staff_users
  WHERE employee_code ~ '^EMP-[0-9]+$';

  new_code := 'EMP-' || LPAD(max_code::text, 3, '0');
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.generate_employee_code() IS 'Auto-generates next employee code in sequence (EMP-001, EMP-002, etc.)';


-- Function to check for duplicate vehicles in claims
CREATE OR REPLACE FUNCTION public.check_duplicate_claim()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.claims
    WHERE vehicle_reg_no = NEW.vehicle_reg_no
      AND payment_date = NEW.payment_date
      AND status != 'rejected'
      AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Duplicate claim detected for vehicle % on date %', NEW.vehicle_reg_no, NEW.payment_date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_duplicate_claim_trigger ON public.claims;
CREATE TRIGGER check_duplicate_claim_trigger
  BEFORE INSERT OR UPDATE ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.check_duplicate_claim();

COMMENT ON FUNCTION public.check_duplicate_claim() IS 'Prevents duplicate claims for same vehicle on same date';


-- Function to auto-create policy from approved claim
CREATE OR REPLACE FUNCTION public.auto_create_policy_from_claim()
RETURNS trigger AS $$
BEGIN
  -- Only create policy if claim is approved and no policy exists
  IF NEW.status = 'approved' AND NEW.policy_id IS NULL AND OLD.status != 'approved' THEN
    INSERT INTO public.policies (
      vehicle_reg_no,
      owner_name,
      holder_mobile,
      due_date,
      saod_due_date,
      status,
      source,
      verification_status,
      created_at
    ) VALUES (
      NEW.vehicle_reg_no,
      NEW.customer_name,
      NEW.customer_mobile,
      NEW.saod_due_date,
      NEW.saod_due_date,
      'Active',
      'advisor_added',
      'unverified',
      now()
    )
    RETURNING id INTO NEW.policy_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_policy_trigger ON public.claims;
CREATE TRIGGER auto_create_policy_trigger
  BEFORE UPDATE ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_policy_from_claim();

COMMENT ON FUNCTION public.auto_create_policy_from_claim() IS 'Automatically creates a policy when claim is approved for unknown vehicle';


-- ===========================================
-- 7. SEED DATA FOR DEVELOPMENT
-- ===========================================

-- Insert default grid columns for policy data grid
INSERT INTO public.grid_columns (accessor_key, header_label, data_type, is_visible, sort_order)
VALUES
  ('id', 'ID', 'text', false, 0),
  ('vehicle_category', 'Category', 'text', true, 1),
  ('vehicle_reg_no', 'Registration No', 'text', true, 2),
  ('owner_name', 'Owner Name', 'text', true, 3),
  ('holder_mobile', 'Mobile', 'text', true, 4),
  ('saod_due_date', 'SAOD Due', 'date', true, 5),
  ('tp_due_date', 'TP Due', 'date', true, 6),
  ('insurer_name', 'Insurer', 'text', true, 7),
  ('policy_number', 'Policy No', 'text', true, 8),
  ('status', 'Status', 'text', true, 9)
ON CONFLICT (accessor_key) DO NOTHING;


-- ===========================================
-- 8. UPDATE RLS POLICIES
-- ===========================================

-- Enable RLS on new tables
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grid_columns ENABLE ROW LEVEL SECURITY;

-- Claims RLS: Staff can see all claims, users can only see their own
DROP POLICY IF EXISTS "Staff can view all claims" ON public.claims;
CREATE POLICY "Staff can view all claims" ON public.claims
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_users
      WHERE staff_users.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can insert claims" ON public.claims;
CREATE POLICY "Staff can insert claims" ON public.claims
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_users
      WHERE staff_users.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can update claims" ON public.claims;
CREATE POLICY "Staff can update claims" ON public.claims
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_users
      WHERE staff_users.auth_user_id = auth.uid()
    )
  );

-- Grid columns RLS: Staff can view and manage
DROP POLICY IF EXISTS "Staff can view grid columns" ON public.grid_columns;
CREATE POLICY "Staff can view grid columns" ON public.grid_columns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_users
      WHERE staff_users.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin can manage grid columns" ON public.grid_columns;
CREATE POLICY "Admin can manage grid columns" ON public.grid_columns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_users
      WHERE staff_users.auth_user_id = auth.uid()
        AND staff_users.role IN ('admin', 'superadmin')
    )
  );


-- ===========================================
-- 9. CREATE VIEWS FOR REPORTING
-- ===========================================

-- View: Claims with related data
CREATE OR REPLACE VIEW public.claims_with_details AS
SELECT
  c.id,
  c.vehicle_reg_no,
  c.employee_name,
  s.full_name as staff_name,
  s.employee_code,
  c.payment_date,
  c.payment_mode,
  c.payment_amount,
  c.status,
  c.customer_name,
  c.customer_mobile,
  p.policy_number,
  p.owner_name as policy_owner,
  p.status as policy_status,
  c.created_at,
  c.reviewed_at,
  r.full_name as reviewed_by_name
FROM public.claims c
LEFT JOIN public.staff_users s ON c.staff_id = s.id
LEFT JOIN public.policies p ON c.policy_id = p.id
LEFT JOIN public.staff_users r ON c.reviewed_by = r.id;

COMMENT ON VIEW public.claims_with_details IS 'Claims with joined staff and policy information for reporting';


-- View: Staff performance metrics
CREATE OR REPLACE VIEW public.staff_performance AS
SELECT
  s.id,
  s.full_name,
  s.employee_code,
  s.designation,
  COUNT(c.id) as total_claims,
  COUNT(CASE WHEN c.status = 'approved' THEN 1 END) as approved_claims,
  COUNT(CASE WHEN c.status = 'pending' THEN 1 END) as pending_claims,
  SUM(CASE WHEN c.status = 'approved' THEN c.payment_amount ELSE 0 END) as total_revenue
FROM public.staff_users s
LEFT JOIN public.claims c ON s.id = c.staff_id
WHERE s.is_active = true
GROUP BY s.id, s.full_name, s.employee_code, s.designation;

COMMENT ON VIEW public.staff_performance IS 'Staff performance metrics based on claims';


-- ===========================================
-- MIGRATION COMPLETE
-- ===========================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'CRM Integration Phase 1 migration completed successfully';
  RAISE NOTICE 'Extended: staff_users, policies';
  RAISE NOTICE 'Created: claims, grid_columns';
  RAISE NOTICE 'Added: Helper functions, triggers, views, RLS policies';
END $$;
