import {hasSupabase,supabase} from './supabase';
import {validateRecommendation} from '../domain/recommendations';
import type {Recommendation,RecommendationInput} from '../domain/recommendations';
export type {Recommendation} from '../domain/recommendations';
const key='runare-demo-recommendations';
const demo=():Recommendation[]=>{try{const rows=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(rows)?rows:[]}catch{return []}};
const fromRow=(r:Record<string,any>):Recommendation=>({id:r.id,authorId:r.author_id,type:r.type,targetUserId:r.target_user_id,title:r.title,description:r.description||'',mapsUrl:r.maps_url||'',createdAt:r.created_at});
export const recommendationGateway={
 async list():Promise<Recommendation[]>{
  if(!hasSupabase||!supabase)return demo();
  const {data,error}=await supabase.from('recommendations').select('*').order('created_at',{ascending:false}).abortSignal(AbortSignal.timeout(12000));
  if(error)throw error;return (data||[]).map(fromRow);
 },
 async create(input:RecommendationInput):Promise<Recommendation>{
  const value=validateRecommendation(input);
  if(!hasSupabase||!supabase){const row={...value,id:crypto.randomUUID(),createdAt:new Date().toISOString()};localStorage.setItem(key,JSON.stringify([row,...demo()]));return row}
  const {data,error}=await supabase.from('recommendations').insert({author_id:value.authorId,type:value.type,target_user_id:value.targetUserId,title:value.title,description:value.description,maps_url:value.mapsUrl}).select().abortSignal(AbortSignal.timeout(12000)).single();
  if(error)throw error;return fromRow(data);
 }
};
