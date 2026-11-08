-- SOLO una base local desechable preparada con bootstrap-v14.sql y el instalador v15.
do $$ begin
 if not exists(select 1 from public.profiles where id='11111111-1111-4111-8111-111111111111' and animal='alpaca' and habitat='jardin') then raise exception 'Se perdió el perfil antiguo'; end if;
 if not exists(select 1 from public.posts where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and body='Se conserva después de migrar') then raise exception 'Se perdió la publicación anterior'; end if;
end; $$;
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select public.share_my_location(-12.046374,-77.042793);
do $$ begin
 if not exists(select 1 from public.shared_locations where user_id=auth.uid() and latitude=-12.046 and longitude=-77.043 and expires_at>now() and expires_at<=now()+interval '30 minutes') then raise exception 'Coordenadas o caducidad incorrectas'; end if;
 if public.get_neighbor_call_phone(auth.uid()) is not null then raise exception 'Las llamadas estaban habilitadas sin consentimiento'; end if;
 begin
  insert into public.shared_locations(user_id,latitude,longitude,expires_at) values('22222222-2222-4222-8222-222222222222',0,0,now()+interval '1 minute');
  raise exception 'Se permitió escribir ubicación ajena';
 exception when insufficient_privilege then null; end;
 begin perform public.share_my_location(91,0);raise exception 'Se permitió latitud inválida';
 exception when raise_exception then if sqlerrm='Se permitió latitud inválida' then raise; end if; end;
 begin insert into public.recommendations(author_id,type,target_user_id,title) values(auth.uid(),'vecino',auth.uid(),'Yo mismo');raise exception 'Se permitió autorrecomendación';
 exception when check_violation then null; end;
end; $$;
insert into public.recommendations(author_id,type,target_user_id,title) values(auth.uid(),'vecino','22222222-2222-4222-8222-222222222222','Gracias por la ayuda');
update public.posts set latitude=-12.046374,longitude=-77.042793 where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$ begin
 if not exists(select 1 from public.posts where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and latitude=-12.046 and longitude=-77.043) then raise exception 'No se aproximó el aviso'; end if;
 begin update public.posts set longitude=null where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';raise exception 'Se permitió una coordenada sola';
 exception when raise_exception then if sqlerrm='Se permitió una coordenada sola' then raise; end if; end;
end; $$;
select public.set_my_call_consent(true);
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$ declare changed integer; begin
 if public.get_neighbor_call_phone('11111111-1111-4111-8111-111111111111')<>'51987654321' then raise exception 'No funciona el consentimiento de llamada'; end if;
 update public.shared_locations set latitude=0 where user_id='11111111-1111-4111-8111-111111111111';get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Se modificó ubicación ajena'; end if;
 delete from public.posts where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Se eliminó una publicación ajena'; end if;
end; $$;
reset role;
-- Simular paso del tiempo sin esperar 30 minutos (solo el administrador de pruebas).
alter table public.shared_locations disable trigger round_shared_location_before_write;
update public.shared_locations set expires_at=now()-interval '1 minute';
alter table public.shared_locations enable trigger round_shared_location_before_write;
set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$ begin if exists(select 1 from public.shared_locations where user_id='11111111-1111-4111-8111-111111111111') then raise exception 'Se expone una ubicación vencida'; end if;end; $$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select public.share_my_location(-12.05,-77.04);
delete from public.shared_locations where user_id=auth.uid();
select public.set_my_call_consent(false);
delete from public.posts where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
reset role;
do $$ begin
 if exists(select 1 from public.shared_locations where user_id='11111111-1111-4111-8111-111111111111') then raise exception 'No dejó de compartir'; end if;
 if exists(select 1 from public.posts where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') then raise exception 'El autor no pudo eliminar'; end if;
 if exists(select 1 from public.private_contacts where user_id='11111111-1111-4111-8111-111111111111' and calls_enabled) then raise exception 'No se revocó el permiso'; end if;
end; $$;
set role anon;
do $$ begin
 begin perform * from public.shared_locations;raise exception 'Acceso anónimo permitido';
 exception when insufficient_privilege then null;end;
 begin perform public.share_my_location(0,0);raise exception 'Compartir anónimo permitido';
 exception when insufficient_privilege then null;end;
end; $$;
reset role;
select 'OK: conservación, RLS, coordenadas, caducidad, llamadas y eliminación' as resultado;
