-- import-businesses, design D-2: one row per applied import (business-import spec, "Import record").
-- A prod import compares its file's SHA-256 with the last row in dev ("Review in dev before prod").
-- No column can hold a business value: one count per plan group, and a text column that accepts only a SHA-256.
CREATE TABLE business_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_sha256 TEXT NOT NULL CHECK (file_sha256 ~ '^[0-9a-f]{64}$'),
  generated_at DATE NOT NULL,
  added_count INTEGER NOT NULL,
  changed_count INTEGER NOT NULL,
  deactivated_count INTEGER NOT NULL,
  reactivated_count INTEGER NOT NULL,
  unchanged_count INTEGER NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
