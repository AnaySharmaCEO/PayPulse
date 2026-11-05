-- PayPulse Schema Migration: Initial Core Tables & Grants
-- Migration: 20261105000001_init_schema.sql
-- Note: Explicit grants are required because automatic schema grants are disabled on this instance.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paypal_order_id TEXT NOT NULL UNIQUE,
    intent TEXT NOT NULL CHECK (intent IN ('CAPTURE', 'AUTHORIZE')),
    status TEXT NOT NULL CHECK (status IN ('CREATED', 'SAVED', 'APPROVED', 'VOIDED', 'COMPLETED', 'PAYER_ACTION_REQUIRED')),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    total_amount_minor BIGINT NOT NULL,
    customer_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Webhook / Event Ingestion Journal (Idempotent Inbox)
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id TEXT NOT NULL UNIQUE, -- PayPal event UUID
    event_type TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Webhook SLA Expectations (Expectation State Machine)
CREATE TABLE IF NOT EXISTS public.expectations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    paypal_order_id TEXT NOT NULL,
    expected_event_type TEXT NOT NULL,
    expected_before TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'FULFILLED', 'BREACHED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 4. Incidents & Healing Journal
CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    paypal_order_id TEXT,
    category TEXT NOT NULL CHECK (category IN (
        'ITEM_TOTAL_MISMATCH',
        'SIGNATURE_FAILURE',
        'OVERDUE_CAPTURE',
        'DUPLICATE_EVENT',
        'OUT_OF_ORDER',
        'AUTH_EXPIRED',
        'DATABASE_WRITE_FAILURE',
        'UNHANDLED_ERROR'
    )),
    severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status TEXT NOT NULL DEFAULT 'DETECTED' CHECK (status IN ('DETECTED', 'DIAGNOSING', 'HEALED', 'MANUAL_INTERVENTION_REQUIRED')),
    root_cause TEXT,
    remediation_action TEXT,
    automated BOOLEAN NOT NULL DEFAULT TRUE,
    confidence_score NUMERIC(4, 2),
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 5. Chaos Rules (for Fault Injection & Live Demo)
CREATE TABLE IF NOT EXISTS public.chaos_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    scenario TEXT NOT NULL CHECK (scenario IN ('DROP_WEBHOOK', 'CORRUPT_PAYLOAD', 'DELAY_DELIVERY', 'SIMULATE_MISMATCH')),
    active BOOLEAN NOT NULL DEFAULT FALSE,
    delay_ms INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_paypal_id ON public.orders(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_events_event_id ON public.events(event_id);
CREATE INDEX IF NOT EXISTS idx_expectations_status_time ON public.expectations(status, expected_before);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expectations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chaos_rules ENABLE ROW LEVEL SECURITY;

-- Explicit schema permissions for anon, authenticated, and service_role
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- RLS Policies
-- Allow read access to anon for dashboard displays and demo storefront
CREATE POLICY "Allow anon read orders" ON public.orders FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert orders" ON public.orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update orders" ON public.orders FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow anon read events" ON public.events FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert events" ON public.events FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon read expectations" ON public.expectations FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read incidents" ON public.incidents FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read chaos_rules" ON public.chaos_rules FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon update chaos_rules" ON public.chaos_rules FOR UPDATE TO anon USING (true);

-- Service role has full unrestricted access
CREATE POLICY "Service role full access orders" ON public.orders FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access events" ON public.events FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access expectations" ON public.expectations FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access incidents" ON public.incidents FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access chaos_rules" ON public.chaos_rules FOR ALL TO service_role USING (true);
