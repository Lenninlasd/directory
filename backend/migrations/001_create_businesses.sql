-- Spec 001, plan 001 section 2: businesses shown in the directory.
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  location_summary TEXT NOT NULL,
  has_physical_store BOOLEAN NOT NULL,
  whatsapp_number TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
