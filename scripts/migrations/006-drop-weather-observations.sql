-- Drops the weather_observations table.
--
-- Reason: vedur.is automatic stations don't report cloud cover or
-- visibility in observations (only manned synoptic stations do, none of
-- which are on the eclipse path), so the only signal we ever read from
-- this table was the per-station `timestamp` to render "Station updated
-- N min ago" in the weather dock. The temp / wind / precipitation
-- columns were ingested but never surfaced in the UI.
--
-- We're dropping the table outright and falling back to the global
-- forecast-batch freshness signal already exposed by
-- /api/weather/cloud-cover (`fetched_at` + `stale`).

BEGIN;

DROP TABLE IF EXISTS weather_observations;

COMMIT;
