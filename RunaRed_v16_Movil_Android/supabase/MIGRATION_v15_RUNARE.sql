-- RunaRe v15: run ONCE on existing VeciRed v14 Supabase database.
-- Review and back up before execution. DO NOT rerun the original v14 schema.
BEGIN;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_animal_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_animal_check CHECK (animal IN ('castor','cuy','gallito','llama','vicuna','oso','vizcacha','alpaca'));
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_habitat_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_habitat_check CHECK (habitat IN ('estanque','andes','bosque','costa','valle','nublado','jardin'));
CREATE TABLE IF NOT EXISTS public.recommendations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 type text NOT NULL CHECK (type IN ('vecino','lugar')),
 target_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 90),
 description text NOT NULL DEFAULT '' CHECK (char_length(description)<=500),
 maps_url text NOT NULL DEFAULT '' CHECK (maps_url='' OR maps_url ~ '^https://(www\.)?google\.com/' OR maps_url ~ '^https://maps\.google\.com/' OR maps_url ~ '^https://maps\.app\.goo\.gl/'),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recommendations read" ON public.recommendations FOR SELECT TO authenticated USING(true);
CREATE POLICY "recommendations insert own" ON public.recommendations FOR INSERT TO authenticated WITH CHECK (author_id=auth.uid() AND (type <> 'vecino' OR target_user_id IS NOT NULL));
CREATE POLICY "recommendations delete own" ON public.recommendations FOR DELETE TO authenticated USING(author_id=auth.uid());
-- Extend the original auth trigger to recognize new mascots/habitats.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.profiles(id,display_name,animal,habitat,hobby) VALUES (
 new.id, left(coalesce(nullif(new.raw_user_meta_data->>'display_name',''),split_part(new.email,'@',1)),60),
 CASE WHEN new.raw_user_meta_data->>'animal' IN ('castor','cuy','gallito','llama','vicuna','oso') THEN new.raw_user_meta_data->>'animal' ELSE 'castor' END,
 CASE WHEN new.raw_user_meta_data->>'habitat' IN ('estanque','andes','bosque','costa','valle','nublado') THEN new.raw_user_meta_data->>'habitat' ELSE 'estanque' END,
 left(coalesce(new.raw_user_meta_data->>'hobby',''),100));
 INSERT INTO public.private_contacts(user_id,whatsapp_phone) VALUES (new.id,CASE WHEN (new.raw_user_meta_data->>'phone') ~ '^519[0-9]{8}$' THEN new.raw_user_meta_data->>'phone' ELSE null END);
 RETURN new;
END;$$;
COMMIT;
-- IMPORTANT: v14 policies allow broad authenticated access; enforce verified community-scoped RLS
-- and rate limiting BEFORE real public deployment. This migration does not solve that issue.
