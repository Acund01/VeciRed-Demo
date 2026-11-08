import {hasSupabase,supabase} from '../infrastructure/supabase';
import type {UserProfile} from '../models/types';

export type SharedLocation={
 userId:string;
 displayName:string;
 latitude:number;
 longitude:number;
 expiresAt:string;
};

const demoKey='runared:shared-location';
const shareDurationMs=30*60*1000;

function readDemo():SharedLocation[]{
 try{
  const value=JSON.parse(localStorage.getItem(demoKey)||'[]') as SharedLocation[];
  return value.filter(location=>Date.parse(location.expiresAt)>Date.now());
 }catch{return []}
}

function client(){
 if(!supabase)throw new Error('Supabase no está configurado.');
 return supabase;
}

export const sharedLocationGateway={
 async list():Promise<SharedLocation[]>{
  if(!hasSupabase)return readDemo();
  const db=client();
  const {error:cleanupError}=await db.rpc('purge_expired_shared_locations');
  if(cleanupError)throw cleanupError;
  const {data,error}=await db.from('shared_locations')
   .select('user_id,latitude,longitude,expires_at,profiles(display_name)')
   .gt('expires_at',new Date().toISOString());
  if(error)throw error;
  return (data||[]).map(row=>({
   userId:row.user_id,
   displayName:row.profiles?.[0]?.display_name||'Vecino',
   latitude:row.latitude,
   longitude:row.longitude,
   expiresAt:row.expires_at,
  }));
 },
 async share(profile:UserProfile,latitude:number,longitude:number):Promise<void>{
  const expiresAt=new Date(Date.now()+shareDurationMs).toISOString();
  if(!hasSupabase){
   localStorage.setItem(demoKey,JSON.stringify([{userId:profile.id,displayName:profile.name,latitude,longitude,expiresAt}] satisfies SharedLocation[]));
   return;
  }
  const {error}=await client().from('shared_locations').upsert({
   user_id:profile.id,latitude,longitude,expires_at:expiresAt,updated_at:new Date().toISOString(),
  },{onConflict:'user_id'});
  if(error)throw error;
 },
 async stopSharing(userId:string):Promise<void>{
  if(!hasSupabase){localStorage.removeItem(demoKey);return}
  const {error}=await client().from('shared_locations').delete().eq('user_id',userId);
  if(error)throw error;
 },
};
