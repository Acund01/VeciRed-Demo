import {supabase} from './supabase';
import type {ChatMessage,Post,Neighbor,UserProfile} from '../models/types';
import type {MessagingGateway,NeighborhoodGateway,ProfileGateway} from './contracts';
function client(){if(!supabase)throw new Error('Supabase no configurado');return supabase}
/** Maps DB records to the app domain; this module is the only DB-dependent layer. */
export const neighborhoodGateway:NeighborhoodGateway={
 async listNeighbors(sector){const {data,error}=await client().from('profiles').select('id,display_name,animal,habitat,hobby,sector_id');if(error)throw error;return (data||[]).map((r,i)=>({id:r.id,name:r.display_name,animal:r.animal,habitat:r.habitat,hobby:r.hobby||'',sector,status:'',rating:0,x:16+(i%4)*22,y:19+Math.floor(i/4)%4*19})) as Neighbor[]},
 async listPosts(){const {data,error}=await client().from('posts').select('id,author_id,kind,title,body,resource,active,created_at').order('created_at',{ascending:false});if(error)throw error;return (data||[]).map(r=>({id:r.id,authorId:r.author_id,kind:r.kind,title:r.title,body:r.body,resource:r.resource||undefined,active:r.active,createdAt:r.created_at})) as Post[]},
 async createPost(input){const {data,error}=await client().from('posts').insert({author_id:input.authorId,kind:input.kind,title:input.title,body:input.body,resource:input.resource,active:input.active}).select().single();if(error)throw error;return {id:data.id,authorId:data.author_id,kind:data.kind,title:data.title,body:data.body,resource:data.resource,active:data.active,createdAt:data.created_at} as Post},
 async closePost(id){const {error}=await client().from('posts').update({active:false}).eq('id',id);if(error)throw error}
};
export const profileGateway:ProfileGateway={async updatePreferences(id,preferences){const {data,error}=await client().from('profiles').update({animal:preferences.animal,habitat:preferences.habitat,hobby:preferences.hobby}).eq('id',id).select('id,display_name,animal,habitat,hobby').single();if(error)throw error;return {id:data.id,name:data.display_name,animal:data.animal,habitat:data.habitat,hobby:data.hobby,sector:'Zona Norte'} as UserProfile}};
export const messagingGateway:MessagingGateway={
 async listMessages(conversationId){const {data,error}=await client().from('messages').select('id,sender_id,body,created_at').eq('conversation_id',conversationId).order('created_at');if(error)throw error;return (data||[]).map(m=>({id:m.id,from:m.sender_id,text:m.body,createdAt:m.created_at})) as ChatMessage[]},
 async sendMessage(conversationId,text){const {data:{user}}=await client().auth.getUser();if(!user)throw new Error('Debes iniciar sesión');const {data,error}=await client().from('messages').insert({conversation_id:conversationId,sender_id:user.id,body:text}).select().single();if(error)throw error;return {id:data.id,from:data.sender_id,text:data.body,createdAt:data.created_at} as ChatMessage},
 subscribe(conversationId,onMessage){const channel=client().channel('chat:'+conversationId).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'conversation_id=eq.'+conversationId},event=>{const m=event.new;onMessage({id:String(m.id),from:String(m.sender_id),text:String(m.body),createdAt:String(m.created_at)})}).subscribe();return ()=>{void client().removeChannel(channel)}}
};
