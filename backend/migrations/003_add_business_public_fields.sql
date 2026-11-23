-- import-businesses, design D-6: raw values, validated when read
-- (directory spec, "Maps link validity", "Instagram link validity", and "Description validity").
-- Nullable columns only, so the deployed backend keeps working (infrastructure spec, "Database migrations").
ALTER TABLE businesses
  ADD COLUMN maps_url TEXT NULL,
  ADD COLUMN description TEXT NULL,
  ADD COLUMN instagram_url TEXT NULL;
