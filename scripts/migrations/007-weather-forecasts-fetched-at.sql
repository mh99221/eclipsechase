-- Adds `fetched_at` to weather_forecasts.
--
-- Reason: `forecast_time` reflects vedur's batch-issue time (their
-- `atime`), not when *we* successfully called vedur. Vedur only
-- publishes new forecast batches every few hours, so basing our
-- staleness signal on `forecast_time` makes us flap to "stale" between
-- vedur batches even when our cron is healthy.
--
-- `fetched_at` records when our ingest cron last upserted a row. The
-- /api/weather/cloud-cover and /api/weather/forecast-timeline endpoints
-- now compute staleness against the newest `fetched_at` rather than
-- `forecast_time`, which decouples our pipeline-health signal from
-- vedur's publishing cadence.

BEGIN;

-- Add nullable first so we can backfill before enforcing NOT NULL.
ALTER TABLE weather_forecasts
  ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ;

-- Backfill: existing rows weren't ingested *now*, so seed fetched_at
-- from forecast_time. The next cron run will overwrite with the real
-- ingest time on upsert.
UPDATE weather_forecasts
  SET fetched_at = forecast_time
  WHERE fetched_at IS NULL;

ALTER TABLE weather_forecasts
  ALTER COLUMN fetched_at SET DEFAULT NOW(),
  ALTER COLUMN fetched_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS weather_forecasts_fetched_at_idx
  ON weather_forecasts (fetched_at DESC);

COMMIT;
