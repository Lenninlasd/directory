-- import-businesses, design D-7 and D-8: the private fields of the handoff file, never returned by the API
-- (business-import spec, "Private fields stay private"), and the hours the last import wrote.
-- google_place_id is the upsert key (design D-3). Several NULLs do not conflict, so the dev seed rows stay valid.
-- A NULL passes every CHECK. The import requires the values the file always has (business-import spec, "Handoff file").
-- Nullable columns only, so the deployed backend keeps working (infrastructure spec, "Database migrations").
ALTER TABLE businesses
  ADD COLUMN google_place_id TEXT NULL UNIQUE,
  ADD COLUMN latitude DOUBLE PRECISION NULL CHECK (latitude BETWEEN -90 AND 90),
  ADD COLUMN longitude DOUBLE PRECISION NULL CHECK (longitude BETWEEN -180 AND 180),
  ADD COLUMN coordinates_source TEXT NULL,
  ADD COLUMN source_type TEXT NULL CHECK (source_type IN ('storefront', 'company', 'link', 'owner_published', 'private_group')),
  ADD COLUMN source_category TEXT NULL,
  ADD COLUMN activity_score INTEGER NULL CHECK (activity_score BETWEEN 0 AND 100),
  ADD COLUMN activity_as_of DATE NULL,
  ADD COLUMN last_verified_at DATE NULL,
  ADD COLUMN consented_at DATE NULL,
  ADD COLUMN consent_channel TEXT NULL CHECK (consent_channel IN ('whatsapp', 'in_person', 'phone_call', 'email')),
  ADD COLUMN admin_notes TEXT NULL,
  ADD COLUMN imported_opening_hours JSONB NULL;
