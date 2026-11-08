-- RunaRed v17: temporary, opt-in location sharing for the map.
-- Run once in the existing Supabase project after reviewing the policies.
BEGIN;

CREATE TABLE IF NOT EXISTS public.shared_locations (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
 longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
 expires_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shared_locations_expires_at_idx
 ON public.shared_locations (expires_at);

CREATE OR REPLACE FUNCTION public.round_shared_location()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
 NEW.latitude := round(NEW.latitude::numeric, 3)::double precision;
 NEW.longitude := round(NEW.longitude::numeric, 3)::double precision;
 NEW.updated_at := now();
 RETURN NEW;
END;
$$;

CREATE TRIGGER round_shared_location_before_write
 BEFORE INSERT OR UPDATE OF latitude, longitude ON public.shared_locations
 FOR EACH ROW EXECUTE FUNCTION public.round_shared_location();

ALTER TABLE public.shared_locations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_locations TO authenticated;

CREATE POLICY "shared locations read while active"
 ON public.shared_locations FOR SELECT TO authenticated
 USING (expires_at > now());

CREATE POLICY "share own location for at most 30 minutes"
 ON public.shared_locations FOR INSERT TO authenticated
 WITH CHECK (
  user_id = auth.uid()
  AND expires_at > now()
  AND expires_at <= now() + interval '31 minutes'
 );

CREATE POLICY "update own shared location"
 ON public.shared_locations FOR UPDATE TO authenticated
 USING (user_id = auth.uid())
 WITH CHECK (
  user_id = auth.uid()
  AND expires_at > now()
  AND expires_at <= now() + interval '31 minutes'
 );

CREATE POLICY "stop sharing own location"
 ON public.shared_locations FOR DELETE TO authenticated
 USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.purge_expired_shared_locations()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
 DELETE FROM public.shared_locations WHERE expires_at <= now();
$$;

REVOKE ALL ON FUNCTION public.purge_expired_shared_locations() FROM public;
GRANT EXECUTE ON FUNCTION public.purge_expired_shared_locations() TO authenticated;

COMMIT;
