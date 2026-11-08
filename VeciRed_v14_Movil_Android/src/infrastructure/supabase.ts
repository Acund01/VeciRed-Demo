import { createClient } from '@supabase/supabase-js';
import type { UserProfile, Animal, Habitat } from '../models/types';
const url=import.meta.env.VITE_SUPABASE_URL;
const anon=import.meta.env.VITE_SUPABASE_ANON_KEY;
export const hasSupabase=Boolean(url&&anon);
export const supabase=hasSupabase?createClient(url,anon,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
export async function signIn(email:string,password:string):Promise<UserProfile>{
 if(!supabase)throw new Error('Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
 const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;
 const {data:row,error:profileError}=await supabase.from('profiles').select('id,display_name,animal,habitat,hobby').eq('id',data.user.id).single();if(profileError)throw profileError;
 return {id:row.id,name:row.display_name,animal:row.animal,habitat:row.habitat,hobby:row.hobby,sector:'Zona Norte',phone:undefined} as UserProfile;
}
export async function signUp(email:string,password:string,name:string,phone?:string,animal:Animal='castor',habitat:Habitat='estanque',hobby:string=''):Promise<void>{
 if(!supabase)throw new Error('Configura Supabase antes de registrar cuentas reales.');
 const {error}=await supabase.auth.signUp({email,password,options:{data:{display_name:name,phone:phone||null,animal,habitat,hobby}}});if(error)throw error;
 // Backend: create profiles via secure auth.users trigger; don't trust a client-supplied identity.
}
export async function signOut(){if(supabase){const {error}=await supabase.auth.signOut();if(error)throw error}}

export async function restoreSession():Promise<UserProfile|null>{
 if(!supabase)return null;const {data:{session},error}=await supabase.auth.getSession();if(error||!session)return null;
 const {data,error:profileError}=await supabase.from('profiles').select('id,display_name,animal,habitat,hobby').eq('id',session.user.id).single();
 if(profileError||!data)return null;return {id:data.id,name:data.display_name,animal:data.animal,habitat:data.habitat,hobby:data.hobby||'',sector:'Zona Norte',phone:undefined} as UserProfile;
}
