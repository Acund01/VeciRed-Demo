-- RunaRed v17: optional approximate coordinates for active community posts.
-- Run once on the existing Supabase project after reviewing and backing it up.
BEGIN;

ALTER TABLE public.posts
 ADD COLUMN IF NOT EXISTS latitude double precision,
 ADD COLUMN IF NOT EXISTS longitude double precision;

DO $$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM pg_constraint
  WHERE conname='posts_location_pair_check'
   AND conrelid='public.posts'::regclass
 ) THEN
  ALTER TABLE public.posts ADD CONSTRAINT posts_location_pair_check CHECK (
   (latitude IS NULL AND longitude IS NULL)
   OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  );
 END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.round_post_map_location()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
 IF (NEW.latitude IS NULL) <> (NEW.longitude IS NULL) THEN
  RAISE EXCEPTION 'Latitude and longitude must both be provided';
 END IF;
 IF NEW.latitude IS NOT NULL THEN
  NEW.latitude := round(NEW.latitude::numeric, 3)::double precision;
  NEW.longitude := round(NEW.longitude::numeric, 3)::double precision;
 END IF;
 RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS round_post_map_location_before_write ON public.posts;
CREATE TRIGGER round_post_map_location_before_write
 BEFORE INSERT OR UPDATE OF latitude,longitude ON public.posts
 FOR EACH ROW EXECUTE FUNCTION public.round_post_map_location();

COMMIT;
