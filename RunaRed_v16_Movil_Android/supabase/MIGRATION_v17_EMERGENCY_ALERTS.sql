-- RunaRed v17: live emergency alerts with optional, approximate coordinates.
-- Apply after MIGRATION_v15_RUNARE.sql and the other v17 migrations.
BEGIN;

CREATE TABLE IF NOT EXISTS public.active_emergencies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 incident_type text NOT NULL CHECK (incident_type IN ('sismo','huayco','incendio','robo','salud','inundacion')),
 latitude double precision,
 longitude double precision,
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','resolved')),
 created_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz,
 CONSTRAINT active_emergencies_location_pair_check CHECK (
  (latitude IS NULL AND longitude IS NULL)
  OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
 )
);

CREATE UNIQUE INDEX IF NOT EXISTS active_emergencies_one_per_user_idx
 ON public.active_emergencies(user_id) WHERE status='active';
CREATE INDEX IF NOT EXISTS active_emergencies_created_at_idx
 ON public.active_emergencies(created_at DESC) WHERE status='active';

CREATE OR REPLACE FUNCTION public.round_emergency_location()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF (NEW.latitude IS NULL) <> (NEW.longitude IS NULL) THEN
  RAISE EXCEPTION 'Latitude and longitude must both be provided';
 END IF;
 IF NEW.latitude IS NOT NULL THEN
  NEW.latitude := round(NEW.latitude::numeric,3)::double precision;
  NEW.longitude := round(NEW.longitude::numeric,3)::double precision;
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS round_emergency_location_before_write ON public.active_emergencies;
CREATE TRIGGER round_emergency_location_before_write
 BEFORE INSERT OR UPDATE OF latitude,longitude ON public.active_emergencies
 FOR EACH ROW EXECUTE FUNCTION public.round_emergency_location();

ALTER TABLE public.active_emergencies ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON public.active_emergencies TO authenticated;
DROP POLICY IF EXISTS "emergencies active or own read" ON public.active_emergencies;
CREATE POLICY "emergencies active or own read" ON public.active_emergencies
 FOR SELECT TO authenticated USING (status='active' OR user_id=auth.uid());
DROP POLICY IF EXISTS "create own emergency" ON public.active_emergencies;
CREATE POLICY "create own emergency" ON public.active_emergencies
 FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() AND status='active' AND resolved_at IS NULL);
DROP POLICY IF EXISTS "resolve own emergency" ON public.active_emergencies;
CREATE POLICY "resolve own emergency" ON public.active_emergencies
 FOR UPDATE TO authenticated USING (user_id=auth.uid() AND status='active')
 WITH CHECK (user_id=auth.uid() AND status='resolved' AND resolved_at IS NOT NULL AND latitude IS NULL AND longitude IS NULL);

-- Private Supabase Realtime Broadcast topic used for active-app notifications.
DROP POLICY IF EXISTS "authenticated emergency broadcast receive" ON realtime.messages;
CREATE POLICY "authenticated emergency broadcast receive" ON realtime.messages
 FOR SELECT TO authenticated USING (realtime.topic()='emergency-feed');
DROP POLICY IF EXISTS "authenticated emergency broadcast send" ON realtime.messages;
CREATE POLICY "authenticated emergency broadcast send" ON realtime.messages
 FOR INSERT TO authenticated WITH CHECK (realtime.topic()='emergency-feed');

COMMIT;
