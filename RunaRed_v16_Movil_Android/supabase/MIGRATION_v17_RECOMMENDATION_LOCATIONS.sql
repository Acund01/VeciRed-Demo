-- RunaRed v17: map locations, place tags, and recognition categories/ratings.
-- Apply this after MIGRATION_v15_RUNARE.sql on the Supabase project.
BEGIN;

ALTER TABLE public.recommendations
 ADD COLUMN IF NOT EXISTS category text,
 ADD COLUMN IF NOT EXISTS rating integer,
 ADD COLUMN IF NOT EXISTS place_tag text,
 ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
 ADD COLUMN IF NOT EXISTS latitude double precision,
 ADD COLUMN IF NOT EXISTS longitude double precision;

DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='recommendations_location_pair_check' AND conrelid='public.recommendations'::regclass) THEN
  ALTER TABLE public.recommendations ADD CONSTRAINT recommendations_location_pair_check CHECK (
   (latitude IS NULL AND longitude IS NULL)
   OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  );
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='recommendations_category_check' AND conrelid='public.recommendations'::regclass) THEN
  ALTER TABLE public.recommendations ADD CONSTRAINT recommendations_category_check CHECK (
   category IS NULL OR category IN ('solidaridad','buen_vecino','servicio_confiable','conocimiento','apoyo_emergencia')
  );
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='recommendations_rating_check' AND conrelid='public.recommendations'::regclass) THEN
  ALTER TABLE public.recommendations ADD CONSTRAINT recommendations_rating_check CHECK (rating IS NULL OR rating BETWEEN 1 AND 5);
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='recommendations_place_tag_check' AND conrelid='public.recommendations'::regclass) THEN
  ALTER TABLE public.recommendations ADD CONSTRAINT recommendations_place_tag_check CHECK (place_tag IS NULL OR char_length(trim(place_tag)) BETWEEN 1 AND 40);
 END IF;
END;
$$;

-- Carry older single place tags and recognition categories into the new multi-tag field.
UPDATE public.recommendations
 SET tags=ARRAY[place_tag]
 WHERE cardinality(tags)=0 AND type='lugar' AND place_tag IS NOT NULL AND char_length(trim(place_tag)) BETWEEN 1 AND 40;
UPDATE public.recommendations
 SET tags=ARRAY[CASE category
  WHEN 'solidaridad' THEN 'Solidaridad'
  WHEN 'buen_vecino' THEN 'Buen vecino'
  WHEN 'servicio_confiable' THEN 'Servicio confiable'
  WHEN 'conocimiento' THEN 'Comparte conocimiento'
  WHEN 'apoyo_emergencia' THEN 'Apoyo en emergencia'
  ELSE category END]
 WHERE cardinality(tags)=0 AND type='vecino' AND category IS NOT NULL;

CREATE OR REPLACE FUNCTION public.normalize_recommendation_tags()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE cleaned text[];
BEGIN
 NEW.tags := coalesce(NEW.tags,ARRAY[]::text[]);
 IF cardinality(NEW.tags)>5 THEN RAISE EXCEPTION 'A recommendation can have at most five tags'; END IF;
 IF EXISTS (SELECT 1 FROM unnest(NEW.tags) AS entry(value) WHERE char_length(btrim(value)) NOT BETWEEN 1 AND 40) THEN
  RAISE EXCEPTION 'Recommendation tags must contain 1 to 40 characters';
 END IF;
 SELECT coalesce(array_agg(tag ORDER BY lower(tag)),ARRAY[]::text[]) INTO cleaned
  FROM (SELECT DISTINCT regexp_replace(btrim(value),'\s+',' ','g') AS tag FROM unnest(NEW.tags) AS entry(value)) AS unique_tags;
 NEW.tags := cleaned;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS normalize_recommendation_tags_before_write ON public.recommendations;
CREATE TRIGGER normalize_recommendation_tags_before_write
 BEFORE INSERT OR UPDATE OF tags ON public.recommendations
 FOR EACH ROW EXECUTE FUNCTION public.normalize_recommendation_tags();

CREATE OR REPLACE FUNCTION public.round_recommendation_map_location()
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

DROP TRIGGER IF EXISTS round_recommendation_location_before_write ON public.recommendations;
CREATE TRIGGER round_recommendation_location_before_write
 BEFORE INSERT OR UPDATE OF latitude,longitude ON public.recommendations
 FOR EACH ROW EXECUTE FUNCTION public.round_recommendation_map_location();

COMMIT;
