-- SOLO base local desechable; preparar v14 -> instalador v15 -> legacy-v18.sql -> incremental v18 (dos veces).
do $$ begin
 if not exists(select 1 from public.profiles where id='11111111-1111-4111-8111-111111111111' and animal='alpaca' and habitat='jardin') then raise exception 'TEST: perfil antiguo perdido';end if;
 if not exists(select 1 from public.posts where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') then raise exception 'TEST: publicación perdida';end if;
 if not exists(select 1 from public.recommendations where id='33333333-3333-4333-8333-333333333333' and maps_url='https://maps.google.com/?q=Lima') then raise exception 'TEST: recomendación antigua perdida';end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='active_emergencies') then raise exception 'TEST: falta publicación Realtime';end if;
end; $$;
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select public.set_my_call_consent(true);
select public.update_my_whatsapp('51911111111');
do $$ begin
 if public.get_my_whatsapp() is distinct from '51911111111' then raise exception 'TEST: no se actualizó el teléfono';end if;
 if public.get_neighbor_call_phone(auth.uid()) is not null then raise exception 'TEST: se conservó consentimiento para un número diferente';end if;
 begin perform public.update_my_whatsapp('123');raise exception 'TEST: teléfono inválido aceptado';
 exception when raise_exception then if sqlerrm like 'TEST:%' then raise;end if;end;
end; $$;
select public.set_my_call_consent(true);
select public.update_my_whatsapp('51911111111');
do $$ begin if public.get_neighbor_call_phone(auth.uid()) is distinct from '51911111111' then raise exception 'TEST: se perdió consentimiento sin cambiar teléfono';end if;end; $$;
select public.update_my_whatsapp(null);
do $$ begin
 if public.get_my_whatsapp() is not null or public.get_neighbor_call_phone(auth.uid()) is not null then raise exception 'TEST: teléfono o consentimiento no retirado';end if;
 if exists(select 1 from public.private_contacts) then raise exception 'TEST: acceso directo a contactos privados';end if;
end; $$;
insert into public.recommendations(id,author_id,type,target_user_id,title,tags,rating)
values('44444444-4444-4444-8444-444444444444',auth.uid(),'vecino','22222222-2222-4222-8222-222222222222','Gracias',array['Solidaridad','solidaridad',' Buen   vecino '],5);
insert into public.recommendations(id,author_id,type,title,tags,latitude,longitude)
values('55555555-5555-4555-8555-555555555555',auth.uid(),'lugar','Parque',array['Comunidad'],-12.046374,-77.042793);
do $$ begin
 if not exists(select 1 from public.recommendations where id='44444444-4444-4444-8444-444444444444' and tags=array['Solidaridad','Buen vecino'] and rating=5) then raise exception 'TEST: etiquetas o estrellas incorrectas';end if;
 if not exists(select 1 from public.recommendations where id='55555555-5555-4555-8555-555555555555' and latitude=-12.046 and longitude=-77.043) then raise exception 'TEST: precisión del lugar incorrecta';end if;
 begin insert into public.recommendations(author_id,type,title,tags) values(auth.uid(),'lugar','Sin punto',array['Lugar']);raise exception 'TEST: lugar sin punto aceptado';
 exception when raise_exception then if sqlerrm like 'TEST:%' then raise;end if;end;
 begin insert into public.recommendations(author_id,type,target_user_id,title,tags,rating) values(auth.uid(),'vecino',auth.uid(),'Yo',array['Ayuda'],5);raise exception 'TEST: autorrecomendación aceptada';
 exception when check_violation then null;end;
 begin insert into public.recommendations(author_id,type,title,tags,latitude,longitude) values(auth.uid(),'lugar','Inválido',array[null]::text[],0,0);raise exception 'TEST: etiqueta nula aceptada';
 exception when raise_exception then if sqlerrm like 'TEST:%' then raise;end if;end;
 begin insert into public.recommendations(author_id,type,target_user_id,title,tags,rating) values('22222222-2222-4222-8222-222222222222','vecino',auth.uid(),'Autor ajeno',array['Ayuda'],5);raise exception 'TEST: autor ajeno aceptado';
 exception when insufficient_privilege then null;end;
end; $$;
insert into public.active_emergencies(id,user_id,incident_type,latitude,longitude)
values('66666666-6666-4666-8666-666666666666',auth.uid(),'sismo',-12.046374,-77.042793);
do $$ begin
 if not exists(select 1 from public.active_emergencies where user_id=auth.uid() and latitude=-12.046 and longitude=-77.043) then raise exception 'TEST: alerta no aproximada';end if;
 begin insert into public.active_emergencies(user_id,incident_type) values(auth.uid(),'robo');raise exception 'TEST: segunda alerta activa aceptada';
 exception when unique_violation then null;end;
 begin update public.active_emergencies set status='resolved',user_id='22222222-2222-4222-8222-222222222222' where user_id=auth.uid();raise exception 'TEST: reasignación aceptada';
 exception when raise_exception then if sqlerrm like 'TEST:%' then raise;end if;end;
end; $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$ declare changed integer;begin
 if not exists(select 1 from public.active_emergencies where id='66666666-6666-4666-8666-666666666666') then raise exception 'TEST: alerta activa invisible';end if;
 update public.active_emergencies set status='resolved' where id='66666666-6666-4666-8666-666666666666';get diagnostics changed=row_count;
 if changed<>0 then raise exception 'TEST: otro usuario resolvió alerta ajena';end if;
 begin insert into public.active_emergencies(user_id,incident_type) values('11111111-1111-4111-8111-111111111111','robo');raise exception 'TEST: emergencia con autor ajeno aceptada';
 exception when insufficient_privilege then null;end;
 if public.get_my_whatsapp() is not null then raise exception 'TEST: getter expuso otro teléfono';end if;
end; $$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
update public.active_emergencies set status='resolved' where id='66666666-6666-4666-8666-666666666666';
do $$ begin
 if not exists(select 1 from public.active_emergencies where id='66666666-6666-4666-8666-666666666666' and status='resolved' and resolved_at is not null and latitude is null and longitude is null) then raise exception 'TEST: resolución no retiró ubicación';end if;
end; $$;
insert into public.active_emergencies(user_id,incident_type) values(auth.uid(),'salud');
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$ begin if exists(select 1 from public.active_emergencies where id='66666666-6666-4666-8666-666666666666') then raise exception 'TEST: otro usuario ve alerta resuelta';end if;end; $$;
reset role;
set role anon;
do $$ begin
 begin perform public.get_my_whatsapp();raise exception 'TEST: getter anónimo permitido';exception when insufficient_privilege then null;end;
 begin perform public.update_my_whatsapp('51911111111');raise exception 'TEST: cambio anónimo permitido';exception when insufficient_privilege then null;end;
 begin perform * from public.active_emergencies;raise exception 'TEST: alertas anónimas permitidas';exception when insufficient_privilege then null;end;
end; $$;
reset role;
select 'OK V18: conservación, privacidad del teléfono, consentimiento, recomendaciones, alertas, RLS y publicación Realtime' as resultado;
