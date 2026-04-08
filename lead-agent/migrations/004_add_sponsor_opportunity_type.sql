-- Migration: 004_add_sponsor_opportunity_type.sql
-- Purpose: Expand opportunity_type to include sponsor and product-integration
-- Created: 2026-04-08

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_opportunity_type_check;
ALTER TABLE leads ADD CONSTRAINT leads_opportunity_type_check
  CHECK (opportunity_type IN ('new-raid', 'sponsor', 'recruiting', 'new-venture', 'product-integration', 'other'));
