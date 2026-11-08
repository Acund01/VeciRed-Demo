import {hasSupabase,supabase} from '../infrastructure/supabase';
import {emergencyTypes} from '../data/emergencies';
import {roundApproximateCoordinates} from '../domain/locations';
import type {UserProfile} from '../models/types';
export type EmergencyTypeId=typeof emergencyTypes[number]['id'];
export type EmergencyAlert={id:string;userId:string;displayName:string;type:EmergencyTypeId;latitude:number|null;longitude:number|null;createdAt:string};
export type EmergencyEvent={action:'activated'|'resolved';alert:EmergencyAlert};
const key='runared:active-emergencies',topic='runared-emergency-feed';
function demo():EmergencyAlert[]{try{const rows:unknown=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(rows)?rows:[]}catch{return []}}
function client(){if(!supabase)throw new Error('Supabase no está configurado.');return supabase}
function fromRow(row:any):EmergencyAlert{const related=Array.isArray(row.profiles)?row.profiles[0]:row.profiles;return {id:row.id,userId:row.user_id,displayName:related?.display_name||'Vecino',type:row.incident_type,latitude:row.latitude??null,longitude:row.longitude??null,createdAt:row.created_at}}
export const emergencyAlertGateway={
 async listActive():Promise<EmergencyAlert[]>{
  if(!hasSupabase)return demo();
  const {data,error}=await client().from('active_emergencies').select('id,user_id,incident_type,latitude,longitude,created_at,profiles(display_name)').eq('status','active').order('created_at',{ascending:false}).abortSignal(AbortSignal.timeout(12000));
  if(error)throw error;return (data||[]).map(fromRow);
 },
 async activate(profile:UserProfile,type:EmergencyTypeId,point:{latitude:number;longitude:number}|null):Promise<EmergencyAlert>{
  if(!emergencyTypes.some(item=>item.id===type))throw new Error('Tipo de emergencia inválido.');
  const location=point?roundApproximateCoordinates(point.latitude,point.longitude):null;
  if(!hasSupabase){
   if(demo().some(row=>row.userId===profile.id))throw new Error('Ya tienes una alerta activa.');
   const row={id:crypto.randomUUID(),userId:profile.id,displayName:profile.name,type,latitude:location?.latitude??null,longitude:location?.longitude??null,createdAt:new Date().toISOString()};
   localStorage.setItem(key,JSON.stringify([row,...demo()]));return row;
  }
  const {data,error}=await client().from('active_emergencies').insert({user_id:profile.id,incident_type:type,latitude:location?.latitude??null,longitude:location?.longitude??null}).select('id,user_id,incident_type,latitude,longitude,created_at,profiles(display_name)').abortSignal(AbortSignal.timeout(12000)).single();
  if(error)throw error;return fromRow(data);
 },
 async resolve(alert:EmergencyAlert):Promise<void>{
  if(!hasSupabase){localStorage.setItem(key,JSON.stringify(demo().filter(row=>row.id!==alert.id)));return}
  const {error}=await client().from('active_emergencies').update({status:'resolved',resolved_at:new Date().toISOString(),latitude:null,longitude:null}).eq('id',alert.id).eq('user_id',alert.userId).select('id').abortSignal(AbortSignal.timeout(12000)).single();
  if(error)throw error;
 },
 subscribe(onChange:()=>void):()=>void{
  if(!hasSupabase){const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel(topic):null;if(channel)channel.onmessage=()=>onChange();const storage=(event:StorageEvent)=>{if(event.key===key)onChange()};window.addEventListener('storage',storage);return()=>{channel?.close();window.removeEventListener('storage',storage)}}
  const db=client();const channel=db.channel('v18-emergency-changes').on('postgres_changes',{event:'*',schema:'public',table:'active_emergencies'},()=>onChange()).subscribe();
  return()=>{void db.removeChannel(channel)};
 },
 async publish(_event:EmergencyEvent):Promise<void>{
  // Remote events originate from database writes, never from client-authored broadcasts.
  if(hasSupabase||typeof BroadcastChannel==='undefined')return;
  const channel=new BroadcastChannel(topic);channel.postMessage({changed:true});channel.close();
 }
};
