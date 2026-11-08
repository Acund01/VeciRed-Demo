-- Aplicar DESPUÉS, sobre la base v14 existente. Conserva contactos y publicaciones.
begin;
alter table public.private_contacts
 add column if not exists calls_enabled boolean not null default false;

create or replace function public.get_my_call_settings() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare contact public.private_contacts%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into contact from public.private_contacts where user_id = auth.uid();
 return jsonb_build_object('has_phone', contact.whatsapp_phone is not null,
                          'allowed', coalesce(contact.calls_enabled, false));
end; $$;

create or replace function public.set_my_call_consent(allowed boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if allowed is null then raise exception 'Consent is required'; end if;
 update public.private_contacts set calls_enabled = allowed
 where user_id = auth.uid() and (not allowed or whatsapp_phone is not null);
 if not found then raise exception 'No hay un teléfono registrado'; end if;
end; $$;

create or replace function public.get_neighbor_call_phone(target_user_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 -- Misma limitación que WhatsApp: restringir por comunidad verificada antes de uso público.
 return (select whatsapp_phone from public.private_contacts
         where user_id = target_user_id and calls_enabled = true);
end; $$;

revoke all on function public.get_my_call_settings() from public, anon;
revoke all on function public.set_my_call_consent(boolean) from public, anon;
revoke all on function public.get_neighbor_call_phone(uuid) from public, anon;
grant execute on function public.get_my_call_settings() to authenticated;
grant execute on function public.set_my_call_consent(boolean) to authenticated;
grant execute on function public.get_neighbor_call_phone(uuid) to authenticated;
commit;
