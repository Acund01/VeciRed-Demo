import {hasSupabase,supabase} from '../infrastructure/supabase';
import {activeLocations,roundApproximateCoordinates} from '../domain/locations';
import type {UserProfile} from '../models/types';
export type SharedLocation={userId:string;displayName:string;latitude:number;longitude:number;expiresAt:string};
const demoKey='runared:shared-location';
function readDemo():SharedLocation[]{
 try{const rows:unknown=JSON.parse(localStorage.getItem(demoKey)||'[]');return Array.isArray(rows)?activeLocations(rows):[]}catch{return []}
}
function client(){if(!supabase)throw new Error('Supabase no está configurado.');return supabase}
export const sharedLocationGateway={
 async list():Promise<SharedLocation[]>{
  if(!hasSupabase)return readDemo();
  const {data,error}=await client().from('shared_locations')
   .select('user_id,latitude,longitude,expires_at,profiles(display_name)')
   .abortSignal(AbortSignal.timeout(12000));
  if(error)throw error;
  return activeLocations((data||[]).map(row=>{
   const related=row.profiles as unknown as {display_name?:string}|{display_name?:string}[]|null;
   const profile=Array.isArray(related)?related[0]:related;
   return {userId:row.user_id,displayName:profile?.display_name||'Vecino',latitude:row.latitude,longitude:row.longitude,expiresAt:row.expires_at};
  }));
 },
 async share(profile:UserProfile,latitude:number,longitude:number):Promise<void>{
  const point=roundApproximateCoordinates(latitude,longitude);
  if(!hasSupabase){localStorage.setItem(demoKey,JSON.stringify([{...point,userId:profile.id,displayName:profile.name,expiresAt:new Date(Date.now()+30*60*1000).toISOString()}]));return}
  const {error}=await client().rpc('share_my_location',{p_latitude:point.latitude,p_longitude:point.longitude}).abortSignal(AbortSignal.timeout(12000));
  if(error)throw error;
 },
 async stopSharing(userId:string):Promise<void>{
  if(!hasSupabase){localStorage.removeItem(demoKey);return}
  const {error}=await client().from('shared_locations').delete().eq('user_id',userId).abortSignal(AbortSignal.timeout(12000));
  if(error)throw error;
 }
};
