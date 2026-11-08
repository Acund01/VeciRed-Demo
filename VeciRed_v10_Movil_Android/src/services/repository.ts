import type { Post, UserProfile, ChatMessage } from '../models/types';
/** Adaptador de datos de demostración. Sustituir por Supabase sin cambiar las vistas. */
const read=<T,>(key:string,fallback:T):T=>{try{const s=localStorage.getItem(key);return s?JSON.parse(s) as T:fallback;}catch{return fallback;}};
const write=<T,>(key:string,value:T)=>localStorage.setItem(key,JSON.stringify(value));
export const repository={
 getProfile:()=>read<UserProfile|null>('vecired:profile',null),saveProfile:(p:UserProfile)=>write('vecired:profile',p),logout:()=>localStorage.removeItem('vecired:profile'),
 getPosts:(initial:Post[])=>read<Post[]>('vecired:posts',initial),savePosts:(p:Post[])=>write('vecired:posts',p),
 getChat:(id:string)=>read<ChatMessage[]>('vecired:chat:'+id,[]),saveChat:(id:string,msg:ChatMessage[])=>write('vecired:chat:'+id,msg),
 getDark:()=>read<boolean>('vecired:dark',false),saveDark:(dark:boolean)=>write('vecired:dark',dark)
};
