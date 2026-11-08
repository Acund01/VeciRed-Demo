import {hasSupabase,supabase} from '../infrastructure/supabase';
import {emergencyTypes} from '../data/emergencies';
import type {UserProfile} from '../models/types';

export type EmergencyTypeId=typeof emergencyTypes[number]['id'];
export type EmergencyAlert={id:string;userId:string;displayName:string;type:EmergencyTypeId;latitude:number|null;longitude:number|null;createdAt:string};
export type EmergencyEvent={action:'activated'|'resolved';alert:EmergencyAlert};
const demoKey='runared:active-emergencies';
const channelName='runared-emergency-feed';

function demoAlerts():EmergencyAlert[]{try{return JSON.parse(localStorage.getItem(demoKey)||'[]') as EmergencyAlert[]}catch{return []}}
function client(){if(!supabase)throw new Error('Supabase no está configurado.');return supabase}
function fromRow(row:any):EmergencyAlert{const profile=Array.isArray(row.profiles)?row.profiles[0]:row.profiles;return {id:row.id,userId:row.user_id,displayName:profile?.display_name||row.display_name||'Vecino',type:row.incident_type,latitude:row.latitude??null,longitude:row.longitude??null,createdAt:row.created_at}}

export const emergencyAlertGateway={
 async listActive():Promise<EmergencyAlert[]>{
  if(!hasSupabase)return demoAlerts();
  const {data,error}=await client().from('active_emergencies').select('id,user_id,incident_type,latitude,longitude,created_at,profiles(display_name)').eq('status','active').order('created_at',{ascending:false});
  if(error)throw error;return (data||[]).map(fromRow);
 },
 async activate(profile:UserProfile,type:EmergencyTypeId,point:{latitude:number;longitude:number}|null):Promise<EmergencyAlert>{
  if(!hasSupabase){const row:EmergencyAlert={id:crypto.randomUUID(),userId:profile.id,displayName:profile.name,type,latitude:point?.latitude??null,longitude:point?.longitude??null,createdAt:new Date().toISOString()};localStorage.setItem(demoKey,JSON.stringify([row,...demoAlerts().filter(alert=>alert.userId!==profile.id)]));return row}
  const {data,error}=await client().from('active_emergencies').insert({user_id:profile.id,incident_type:type,latitude:point?.latitude??null,longitude:point?.longitude??null}).select('id,user_id,incident_type,latitude,longitude,created_at,profiles(display_name)').single();
  if(error)throw error;return fromRow(data);
 },
 async resolve(alert:EmergencyAlert):Promise<void>{
  if(!hasSupabase){localStorage.setItem(demoKey,JSON.stringify(demoAlerts().filter(item=>item.id!==alert.id)));return}
  const {error}=await client().from('active_emergencies').update({status:'resolved',resolved_at:new Date().toISOString(),latitude:null,longitude:null}).eq('id',alert.id).eq('user_id',alert.userId);
  if(error)throw error;
 },
 subscribe(onEvent:(event:EmergencyEvent)=>void,onConnectionError?:(message:string)=>void):()=>void{
  if(!hasSupabase){if(typeof BroadcastChannel==='undefined')return()=>{};const channel=new BroadcastChannel(channelName);channel.onmessage=event=>onEvent(event.data as EmergencyEvent);return()=>channel.close()}
  const channel=client().channel('emergency-feed',{config:{private:true}}).on('broadcast',{event:'emergency-alert'},message=>onEvent(message.payload as EmergencyEvent));
  channel.subscribe(status=>{if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')onConnectionError?.('No se pudo conectar al canal de alertas de emergencia. Revisa la migración y Realtime de Supabase.')});return()=>{void client().removeChannel(channel)};
 },
 async publish(event:EmergencyEvent):Promise<void>{
  if(!hasSupabase){if(typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel(channelName);channel.postMessage(event);channel.close()}return}
  const channel=client().channel('emergency-feed',{config:{private:true}});
  try{
   await new Promise<void>((resolve,reject)=>{const timer=window.setTimeout(()=>reject(new Error('No se pudo conectar al canal de notificaciones.')),8000);channel.subscribe(status=>{if(status==='SUBSCRIBED'){window.clearTimeout(timer);resolve()}else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){window.clearTimeout(timer);reject(new Error('No se pudo enviar la notificación en tiempo real.'))}})});
   const result=await channel.send({type:'broadcast',event:'emergency-alert',payload:event});
   if(result!=='ok')throw new Error('No se pudo enviar la notificación en tiempo real.');
  }finally{await client().removeChannel(channel)}
 },
};
