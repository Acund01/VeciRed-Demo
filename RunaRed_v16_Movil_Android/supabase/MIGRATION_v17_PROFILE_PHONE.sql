-- RunaRed v17: allow each authenticated user to read and update only their own WhatsApp number.
-- Apply after MIGRATION_v15_RUNARE.sql on the existing Supabase project.
BEGIN;

CREATE OR REPLACE FUNCTION public.get_my_whatsapp()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE result text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT whatsapp_phone INTO result
  FROM public.private_contacts
  WHERE user_id=auth.uid();
 RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_my_whatsapp() FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_whatsapp() TO authenticated;

CREATE OR REPLACE FUNCTION public.update_my_whatsapp(new_phone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF new_phone IS NOT NULL AND new_phone !~ '^519[0-9]{8}$' THEN
  RAISE EXCEPTION 'Use a valid Peruvian mobile number';
 END IF;
 INSERT INTO public.private_contacts(user_id,whatsapp_phone)
  VALUES(auth.uid(),new_phone)
  ON CONFLICT(user_id) DO UPDATE SET whatsapp_phone=EXCLUDED.whatsapp_phone;
END;
$$;
REVOKE ALL ON FUNCTION public.update_my_whatsapp(text) FROM public;
GRANT EXECUTE ON FUNCTION public.update_my_whatsapp(text) TO authenticated;

COMMIT;
