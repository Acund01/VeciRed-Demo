import {hasSupabase,supabase} from './supabase';
import {validateV18Recommendation} from '../domain/recommendations';
import type {RecommendationInput,Recommendation as BaseRecommendation} from '../domain/recommendations';
export type Recommendation=BaseRecommendation&{tags:string[];rating:number|null;latitude:number|null;longitude:number|null;category:string|null};
const key='runare-demo-recommendations';
const categories:Record<string,string>={solidaridad:'Solidaridad',buen_vecino:'Buen vecino',servicio_confiable:'Servicio confiable',conocimiento:'Comparte conocimiento',apoyo_emergencia:'Apoyo en emergencia'};
function normalized(row:BaseRecommendation&{tag?:string;place_tag?:string}):Recommendation{
 return {...row,tags:Array.isArray(row.tags)?row.tags:row.tag?[row.tag]:row.place_tag?[row.place_tag]:row.category?[categories[row.category]||row.category]:[],rating:row.rating??null,latitude:row.latitude??null,longitude:row.longitude??null,category:row.category??null};
}
const demo=():Recommendation[]=>{try{const rows:unknown=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(rows)?rows.map(normalized):[]}catch{return []}};
const fromRow=(r:Record<string,any>):Recommendation=>normalized({id:r.id,authorId:r.author_id,type:r.type,targetUserId:r.target_user_id,title:r.title,description:r.description||'',mapsUrl:r.maps_url||'',createdAt:r.created_at,tags:r.tags,rating:r.rating,category:r.category,latitude:r.latitude,longitude:r.longitude,place_tag:r.place_tag});
export const recommendationGateway={
 async list():Promise<Recommendation[]>{
  if(!hasSupabase||!supabase)return demo();
  const {data,error}=await supabase.from('recommendations').select('*').order('created_at',{ascending:false}).abortSignal(AbortSignal.timeout(12000));
  if(error)throw error;return (data||[]).map(fromRow);
 },
 async create(input:RecommendationInput):Promise<Recommendation>{
  const value=validateV18Recommendation(input);
  if(!hasSupabase||!supabase){const row=normalized({...value,id:crypto.randomUUID(),createdAt:new Date().toISOString()});localStorage.setItem(key,JSON.stringify([row,...demo()]));return row}
  const {data,error}=await supabase.from('recommendations').insert({author_id:value.authorId,type:value.type,target_user_id:value.targetUserId,title:value.title,description:value.description,maps_url:value.mapsUrl,tags:value.tags,rating:value.rating,category:null,place_tag:value.type==='lugar'?value.tags?.[0]:null,latitude:value.latitude,longitude:value.longitude}).select().abortSignal(AbortSignal.timeout(12000)).single();
  if(error)throw error;return fromRow(data);
 }
};
