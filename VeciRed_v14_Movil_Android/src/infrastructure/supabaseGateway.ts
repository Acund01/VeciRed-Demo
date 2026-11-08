import {supabase} from './supabase';
import type {Post,Neighbor,UserProfile} from '../models/types';
import type {NeighborhoodGateway,ProfileGateway} from './contracts';
function client(){if(!supabase)throw new Error('Supabase no configurado');return supabase}
/** Maps DB records to the app domain; this module is the only DB-dependent layer. */
export const neighborhoodGateway:NeighborhoodGateway={
 async listNeighbors(sector){const {data,error}=await client().from('profiles').select('id,display_name,animal,habitat,hobby,sector_id');if(error)throw error;return (data||[]).map((r,i)=>({id:r.id,name:r.display_name,animal:r.animal,habitat:r.habitat,hobby:r.hobby||'',sector,status:'',rating:0,x:16+(i%4)*22,y:19+Math.floor(i/4)%4*19})) as Neighbor[]},
 async listPosts(){const {data,error}=await client().from('posts').select('*').order('created_at',{ascending:false});if(error)throw error;return (data||[]).map(r=>({id:r.id,authorId:r.author_id,kind:r.kind,title:r.title,body:r.body,resource:r.resource||undefined,active:r.active,latitude:r.latitude??undefined,longitude:r.longitude??undefined,createdAt:r.created_at})) as Post[]},
 async createPost(input){const {data,error}=await client().from('posts').insert({author_id:input.authorId,kind:input.kind,title:input.title,body:input.body,resource:input.resource,active:input.active,...(input.latitude===undefined?{}:{latitude:input.latitude,longitude:input.longitude})}).select().single();if(error)throw error;return {id:data.id,authorId:data.author_id,kind:data.kind,title:data.title,body:data.body,resource:data.resource,active:data.active,latitude:data.latitude??undefined,longitude:data.longitude??undefined,createdAt:data.created_at} as Post},
 async closePost(id){const {error}=await client().from('posts').update({active:false}).eq('id',id).select('id').single();if(error)throw error},
 async deletePost(id){const {error}=await client().from('posts').delete().eq('id',id).select('id').single();if(error)throw error}
};
export const profileGateway:ProfileGateway={async updatePreferences(id,preferences){const {data,error}=await client().from('profiles').update({animal:preferences.animal,habitat:preferences.habitat,hobby:preferences.hobby}).eq('id',id).select('id,display_name,animal,habitat,hobby').single();if(error)throw error;return {id:data.id,name:data.display_name,animal:data.animal,habitat:data.habitat,hobby:data.hobby,sector:'Zona Norte',phone:preferences.phone} as UserProfile}};

/** Solo consulta el teléfono tras una acción explícita de contacto. */
export const contactGateway={
 async getCallSettings():Promise<{hasPhone:boolean;allowed:boolean}>{
  const {data,error}=await client().rpc('get_my_call_settings').abortSignal(AbortSignal.timeout(12000));
  if(error)throw error;
  return {hasPhone:data?.has_phone===true,allowed:data?.allowed===true};
 },
 async setCallConsent(allowed:boolean){
  const {error}=await client().rpc('set_my_call_consent',{allowed}).abortSignal(AbortSignal.timeout(12000));
  if(error)throw error;
 },
 async getCallPhone(neighborId:string):Promise<string|null>{
  const {data,error}=await client().rpc('get_neighbor_call_phone',{target_user_id:neighborId}).abortSignal(AbortSignal.timeout(12000));
  if(error)throw error;
  return typeof data==='string'?data:null;
 },
 async getWhatsApp(neighborId:string):Promise<string|null>{
 const {data,error}=await client().rpc('get_neighbor_whatsapp',{target_user_id:neighborId});
 if(error)throw error;return typeof data==='string'?data:null;
}};
