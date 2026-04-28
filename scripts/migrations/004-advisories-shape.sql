-- Migrate viewing_spots.warnings from string[] to {level, title, body}[]
--
-- Before:  ["High cloud cover risk", "Limited parking", ...]
-- After:   [
--            {"level": "info", "title": "High cloud cover risk", "body": ""},
--            {"level": "info", "title": "Limited parking",       "body": ""},
--            ...
--          ]
--
-- All existing string warnings are migrated as info-level with no body
-- (the existing strings double as titles). After migration, edit each
-- spot's warnings JSONB to set per-row levels (`bad`/`warn`/`info`) and
-- expand bodies where the title alone isn't enough.
--
-- The application code reads BOTH shapes during the rollout window:
-- a string entry renders as info-level for backward compatibility, an
-- object entry uses its real level/title/body. So this migration can
-- run ahead of, alongside, or after a deploy without breaking the UI.
--
-- Idempotent: rows already in object shape are left untouched.

UPDATE viewing_spots
SET warnings = (
  SELECT jsonb_agg(
    CASE
      WHEN jsonb_typeof(elem) = 'string'
        THEN jsonb_build_object(
          'level', 'info',
          'title', elem,
          'body',  ''
        )
      ELSE elem
    END
  )
  FROM jsonb_array_elements(warnings) AS elem
)
WHERE warnings IS NOT NULL
  AND jsonb_typeof(warnings) = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(warnings) AS elem
    WHERE jsonb_typeof(elem) = 'string'
  );

-- Sanity check — every entry should now be an object with the expected
-- keys. Run this read-only after migrating to confirm.
--
--   SELECT slug, warnings
--   FROM viewing_spots
--   WHERE EXISTS (
--     SELECT 1
--     FROM jsonb_array_elements(warnings) AS w
--     WHERE jsonb_typeof(w) <> 'object'
--        OR NOT (w ? 'level' AND w ? 'title' AND w ? 'body')
--   );
