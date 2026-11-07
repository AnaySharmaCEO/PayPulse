-- PayPulse Schema Migration: Initial Core Tables, Constraints, Indexes & RLS
-- Migration: 20261105000001_init_schema.sql
-- Conforms to: DATA_MODEL.md v2.0 (Phase 3 Hardened Architecture)
-- Note: Explicit grants are required because automatic schema grants are disabled on this Supabase project.

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. Orders table: Master ledger with optimistic concurrency version counter
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paypal_order_id TEXT NOT NULL UNIQUE,
    intent TEXT NOT NULL CHECK (intent IN ('CAPTURE', 'AUTHORIZE')),
    status TEXT NOT NULL CHECK (status IN (
        'CREATED', 
        'SAVED', 
        'APPROVED', 
        'VOIDED', 
        'COMPLETED', 
        'PAYER_ACTION_REQUIRED'
    )),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    total_amount_minor BIGINT NOT NULL CHECK (total_amount_minor >= 0),
    customer_email TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 2. Webhook / Event Ingestion Journal (Idempotent Write-Ahead Inbox)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'RECEIVED' CHECK (status IN (
        'RECEIVED', 
        'PROCESSED', 
        'FAILED', 
        'IGNORED_SUPERSEDED', 
        'CHAOS_DROPPED'
    )),
    source TEXT NOT NULL DEFAULT 'PAYPAL_WEBHOOK' CHECK (source IN (
        'PAYPAL_WEBHOOK', 
        'RECONCILER', 
        'CHAOS_LAB', 
        'MANUAL_REPLAY'
    )),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 3. Webhook SLA Expectations (Expectation State Machine)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.expectations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    paypal_order_id TEXT NOT NULL,
    expected_event_type TEXT NOT NULL,
    expected_before TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 
        'FULFILLED', 
        'BREACHED', 
        'CANCELLED'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- =============================================================================
-- 4. Incidents & Healing Journal (AI Doctor Diagnoses & Remediation Code)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    paypal_order_id TEXT,
    category TEXT NOT NULL CHECK (category IN (
        'ITEM_TOTAL_MISMATCH',
        'SIGNATURE_FAILURE',
        'OVERDUE_CAPTURE',
        'DUPLICATE_EVENT',
        'OUT_OF_ORDER',
        'AUTH_EXPIRED',
        'AUTH_HONOR_PERIOD_EXPIRING',
        'DATABASE_WRITE_FAILURE',
        'UNHANDLED_ERROR'
    )),
    severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN (
        'LOW', 
        'MEDIUM', 
        'HIGH', 
        'CRITICAL'
    )),
    status TEXT NOT NULL DEFAULT 'DETECTED' CHECK (status IN (
        'DETECTED', 
        'DIAGNOSING', 
        'HEALED', 
        'MANUAL_INTERVENTION_REQUIRED'
    )),
    root_cause TEXT,
    remediation_action TEXT,
    code_patch TEXT,
    automated BOOLEAN NOT NULL DEFAULT TRUE,
    confidence_score NUMERIC(4, 2),
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- =============================================================================
-- 5. Chaos Rules (for Fault Injection & Live Demo with Auto-Deactivation)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.chaos_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    scenario TEXT NOT NULL CHECK (scenario IN (
        'DROP_WEBHOOK', 
        'CORRUPT_PAYLOAD', 
        'DELAY_DELIVERY', 
        'SIMULATE_MISMATCH'
    )),
    active BOOLEAN NOT NULL DEFAULT FALSE,
    delay_ms INTEGER DEFAULT 0,
    execution_count INTEGER NOT NULL DEFAULT 0,
    max_executions INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 6. Indexes & Query Optimization
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_orders_paypal_id ON public.orders(paypal_order_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_event_id ON public.events(event_id);
CREATE INDEX IF NOT EXISTS idx_expectations_pending_breached 
    ON public.expectations(status, expected_before) 
    WHERE status IN ('PENDING', 'BREACHED');
CREATE INDEX IF NOT EXISTS idx_incidents_detected_at ON public.incidents(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_expectations_order_id ON public.expectations(order_id);

-- =============================================================================
-- 7. Row Level Security (RLS) Enablement
-- =============================================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expectations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chaos_rules ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 8. Explicit Schema Permissions
-- =============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- =============================================================================
-- 9. RLS Policies for Anon (Dashboard, Realtime & Storefront)
-- =============================================================================
CREATE POLICY "Anon read orders" ON public.orders FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert orders" ON public.orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update orders" ON public.orders FOR UPDATE TO anon USING (true);

CREATE POLICY "Anon read events" ON public.events FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert events" ON public.events FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon read expectations" ON public.expectations FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read incidents" ON public.incidents FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read chaos_rules" ON public.chaos_rules FOR SELECT TO anon USING (true);
CREATE POLICY "Anon update chaos_rules" ON public.chaos_rules FOR UPDATE TO anon USING (true);

-- Service role full access
CREATE POLICY "Service role full orders" ON public.orders FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full events" ON public.events FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full expectations" ON public.expectations FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full incidents" ON public.incidents FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full chaos" ON public.chaos_rules FOR ALL TO service_role USING (true);
