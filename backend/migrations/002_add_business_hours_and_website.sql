-- add-business-hours-and-website, design D-1 and D-2: raw values, validated when read
-- (directory spec, "Website validity" and "Opening hours validity").
-- Nullable columns only, so the deployed backend keeps working (infrastructure spec, "Database migrations").
ALTER TABLE businesses
  ADD COLUMN website_url TEXT NULL,
  ADD COLUMN opening_hours JSONB NULL;
