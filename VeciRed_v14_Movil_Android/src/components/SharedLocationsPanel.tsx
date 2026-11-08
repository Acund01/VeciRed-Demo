import {useEffect,useRef,useState} from 'react';
import {LngLatBounds,Map as MapLibreMap,Marker,NavigationControl,Popup,setWorkerUrl} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import {Clock3,LocateFixed,MapPin,RefreshCw,Share2,ShieldCheck,StopCircle} from 'lucide-react';
import {hasSupabase} from '../infrastructure/supabase';
import type {Post,Kind} from '../models/types';
import type {SharedLocation} from '../services/sharedLocations';
import {activeLocations} from '../domain/locations';
setWorkerUrl(workerUrl);
type Props={locations:SharedLocation[];posts:Post[];currentUserId:string;busy:boolean;error:string;onRefresh:()=>void;onShare:()=>void;onStop:()=>void};
const postColors:Record<Kind,string>={servicio:'#007c59',favor:'#df4978',emergencia:'#d73737'};
function MapCanvas({locations,posts,currentUserId}:{locations:SharedLocation[];posts:Post[];currentUserId:string}){
 const container=useRef<HTMLDivElement>(null);const mapRef=useRef<MapLibreMap|null>(null);const centered=useRef(false);
 const [error,setError]=useState('');const [version,setVersion]=useState(0);
 useEffect(()=>{
  if(!container.current)return;
  let active=true;let map:MapLibreMap|undefined;
  try{
   map=new MapLibreMap({container:container.current,style:'https://tiles.openfreemap.org/styles/liberty',center:[-77.0428,-12.0464],zoom:15});
   mapRef.current=map;centered.current=false;
   map.addControl(new NavigationControl({showCompass:false}),'top-right');
   map.on('error',()=>{if(active)setError('No se pudo cargar la cartografía. Revisa tu conexión.')});
   map.on('load',()=>{if(active)setError('')});
   const frame=requestAnimationFrame(()=>map?.resize());
   return()=>{active=false;cancelAnimationFrame(frame);mapRef.current=null;map?.remove()};
  }catch{setError('Este dispositivo no pudo iniciar el mapa.');return()=>{active=false;mapRef.current=null;map?.remove()}}
 },[version]);
 useEffect(()=>{
  const map=mapRef.current;if(!map)return;
  const markers:Marker[]=[];const bounds=new LngLatBounds();let count=0;
  const add=(longitude:number,latitude:number,color:string,title:string,body:string)=>{
   if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude < -90||latitude > 90||longitude < -180||longitude > 180)return;
   const popup=document.createElement('div'),heading=document.createElement('strong'),description=document.createElement('div');
   heading.textContent=title;description.textContent=body;popup.append(heading,description);
   markers.push(new Marker({color}).setLngLat([longitude,latitude]).setPopup(new Popup({offset:22}).setDOMContent(popup)).addTo(map));
   bounds.extend([longitude,latitude]);count++;
  };
  locations.forEach(row=>add(row.longitude,row.latitude,row.userId===currentUserId?'#007c59':'#ff9d00',row.userId===currentUserId?'Tu ubicación':row.displayName,'Compartida por tiempo limitado'));
  posts.filter(post=>post.active&&typeof post.latitude==='number'&&typeof post.longitude==='number').forEach(post=>add(post.longitude!,post.latitude!,postColors[post.kind],post.title,post.body));
  if(count&&!centered.current){map.fitBounds(bounds,{padding:48,maxZoom:16,duration:0});centered.current=true}
  return()=>markers.forEach(marker=>marker.remove());
 },[locations,posts,currentUserId,version]);
 return <><div className="shared-map-canvas" ref={container} aria-label="Mapa de ubicaciones compartidas"/>{error&&<div className="map-load-error" role="alert">{error}<button onClick={()=>{setError('');setVersion(v=>v+1)}}>Reintentar mapa</button></div>}</>;
}
export function SharedLocationsPanel({locations,posts,currentUserId,busy,error,onRefresh,onShare,onStop}:Props){
 const [now,setNow]=useState(Date.now);
 useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),10000);return()=>window.clearInterval(timer)},[]);
 const active=activeLocations(locations,now),mine=active.find(row=>row.userId===currentUserId);
 const postCount=posts.filter(post=>post.active&&typeof post.latitude==='number'&&typeof post.longitude==='number').length;
 const count=postCount+active.length;
 return <section className="shared-map-screen">
  <div className="shared-map-heading"><div><div className="eyebrow">MAPA VECINAL</div><h2>Publicaciones en el mapa</h2><p>{postCount} publicaciones · {active.length} ubicaciones temporales</p></div><button className="map-refresh" disabled={busy} onClick={onRefresh} aria-label="Actualizar ubicaciones"><RefreshCw size={18}/></button></div>
  <div className="shared-map-frame"><MapCanvas locations={active} posts={posts} currentUserId={currentUserId}/>{!count&&<div className="map-empty"><MapPin size={20}/><span>Al publicar, añade un punto para que aparezca en este mapa.</span></div>}</div>
  {error&&<p className="map-error" role="alert">{error}</p>}
  <div className="map-share-card"><div className="map-share-title"><span className="map-share-icon"><LocateFixed size={19}/></span><div><strong>{mine?'Tu ubicación está compartida':'Comparte tu ubicación aproximada'}</strong><span>{mine?<><Clock3 size={13}/> Visible por {Math.max(0,Math.ceil((Date.parse(mine.expiresAt)-now)/60000))} min más</>:'Dejará de ser visible en 30 minutos.'}</span></div></div>
  {mine?<button className="outline map-stop" disabled={busy} onClick={onStop}><StopCircle size={17}/> Dejar de compartir</button>:<button className="primary green" disabled={busy} onClick={onShare}><Share2 size={18}/>{busy?'Obteniendo ubicación…':'Compartir en el mapa'}</button>}
  <p><ShieldCheck size={14}/> La posición se aproxima a unos 100 m y será visible durante 30 minutos. Evita señalar información sensible.</p>
  <div className="map-demo-note">{hasSupabase?'Visible para todos los usuarios autenticados de esta demo, sin filtro por comunidad.':'Demostración local: la ubicación se guarda solo en este navegador.'}</div></div>
 </section>;
}
