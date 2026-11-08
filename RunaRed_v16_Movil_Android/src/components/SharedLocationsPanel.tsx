import {useEffect,useRef} from 'react';
import {LngLatBounds,Map as MapLibreMap,Marker,NavigationControl,Popup,setWorkerUrl} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import {Clock3,LocateFixed,MapPin,RefreshCw,Share2,ShieldCheck,StopCircle} from 'lucide-react';
import {hasSupabase} from '../infrastructure/supabase';
import type {Post,Kind} from '../models/types';
import type {SharedLocation} from '../services/sharedLocations';
import type {EmergencyAlert} from '../services/emergencyAlerts';
import {emergencyTypes} from '../data/emergencies';

setWorkerUrl(workerUrl);

type Props={
 locations:SharedLocation[];
 posts:Post[];
 currentUserId:string;
 busy:boolean;
 error:string;
 onRefresh:()=>void;
 onShare:()=>void;
 onStop:()=>void;
 emergencies:EmergencyAlert[];
};

const postColors:Record<Kind,string>={servicio:'#007c59',favor:'#df4978',emergencia:'#d73737'};

function MapCanvas({locations,posts,currentUserId,emergencies}:{locations:SharedLocation[];posts:Post[];currentUserId:string;emergencies:EmergencyAlert[]}){
 const container=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!container.current)return;
  const mappedPosts=posts.filter(post=>post.active&&typeof post.latitude==='number'&&typeof post.longitude==='number');
  const locatedEmergencies=emergencies.filter(alert=>alert.latitude!==null&&alert.longitude!==null);
  const points=[...locations.map(location=>({longitude:location.longitude,latitude:location.latitude})),...mappedPosts.map(post=>({longitude:post.longitude!,latitude:post.latitude!})),...locatedEmergencies.map(alert=>({longitude:alert.longitude!,latitude:alert.latitude!}))];
  const first=points[0];
  const map=new MapLibreMap({
   container:container.current,
   style:'https://tiles.openfreemap.org/styles/liberty',
   center:first?[first.longitude,first.latitude]:[-77.0428,-12.0464],
   zoom:first?16:15,
  });
  map.addControl(new NavigationControl({showCompass:false}),'top-right');
  if(points.length>1){
   const bounds=points.reduce((result,point)=>result.extend([point.longitude,point.latitude]),new LngLatBounds());
   map.fitBounds(bounds,{padding:48,maxZoom:16});
  }
  const locationMarkers=locations.map(location=>{
   const own=location.userId===currentUserId;
   const popup=document.createElement('div');
   const name=document.createElement('strong');
   name.textContent=own?'Tu ubicación':location.displayName;
   const expiry=document.createElement('div');
   expiry.textContent='Compartida por tiempo limitado';
   popup.append(name,expiry);
   const marker=new Marker({color:own?'#007c59':'#ff9d00'})
    .setLngLat([location.longitude,location.latitude])
    .setPopup(new Popup({offset:22}).setDOMContent(popup))
    .addTo(map);
   return marker;
  });
  const postMarkers=mappedPosts.map(post=>{
   const popup=document.createElement('div');
   const title=document.createElement('strong');title.textContent=post.title;
   const kind=document.createElement('div');kind.textContent=post.kind==='servicio'?'Servicio':post.kind==='favor'?'Favor':'Emergencia';
   const body=document.createElement('div');body.textContent=post.body;
   popup.append(title,kind,body);
   return new Marker({color:postColors[post.kind]}).setLngLat([post.longitude!,post.latitude!])
    .setPopup(new Popup({offset:22}).setDOMContent(popup)).addTo(map);
  });
  const emergencyMarkers=locatedEmergencies.map(alert=>{
   const popup=document.createElement('div');
   const requester=document.createElement('strong');requester.textContent=alert.displayName;
   const kind=document.createElement('div');kind.textContent='Alerta activa · '+(emergencyTypes.find(type=>type.id===alert.type)?.label||alert.type);
   const time=document.createElement('div');time.textContent=new Date(alert.createdAt).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
   popup.append(requester,kind,time);
   return new Marker({color:'#d92d42'}).setLngLat([alert.longitude!,alert.latitude!]).setPopup(new Popup({offset:22}).setDOMContent(popup)).addTo(map);
  });
  requestAnimationFrame(()=>map.resize());
  return()=>{locationMarkers.forEach(marker=>marker.remove());postMarkers.forEach(marker=>marker.remove());emergencyMarkers.forEach(marker=>marker.remove());map.remove()};
 },[locations,posts,currentUserId,emergencies]);
 return <div className="shared-map-canvas" ref={container} aria-label="Mapa de ubicaciones compartidas"/>;
}

function timeLeft(expiresAt:string){
 const minutes=Math.max(0,Math.ceil((Date.parse(expiresAt)-Date.now())/60000));
 return minutes?`Visible por ${minutes} min más`:'La ubicación ya venció';
}

export function SharedLocationsPanel({locations,posts,currentUserId,busy,error,onRefresh,onShare,onStop,emergencies}:Props){
 const mine=locations.find(location=>location.userId===currentUserId);
 const mappedPostCount=posts.filter(post=>post.active&&typeof post.latitude==='number'&&typeof post.longitude==='number').length;
 const locatedEmergencyCount=emergencies.filter(alert=>alert.latitude!==null&&alert.longitude!==null).length;
 const pointCount=mappedPostCount+locations.length+locatedEmergencyCount;
 return <section className="shared-map-screen">
  <div className="shared-map-heading">
   <div><div className="eyebrow">MAPA VECINAL</div><h2>Publicaciones en el mapa</h2><p>{pointCount?`${mappedPostCount} publicación${mappedPostCount===1?'':'es'} · ${locatedEmergencyCount} ${locatedEmergencyCount===1?'alerta activa':'alertas activas'} · ${locations.length} ${locations.length===1?'ubicación temporal':'ubicaciones temporales'}`:'Todavía no hay publicaciones ubicadas'}</p></div>
   <button className="map-refresh" onClick={onRefresh} aria-label="Actualizar ubicaciones"><RefreshCw size={18}/></button>
  </div>
  <div className="shared-map-frame">
   <MapCanvas locations={locations} posts={posts} currentUserId={currentUserId} emergencies={emergencies}/>
   {!pointCount&&<div className="map-empty"><MapPin size={20}/><span>Al publicar, añade un punto para que aparezca en este mapa.</span></div>}
  </div>
  {error&&<p className="map-error" role="alert">{error}</p>}
  <div className="map-share-card">
   <div className="map-share-title"><span className="map-share-icon"><LocateFixed size={19}/></span><div><strong>{mine?'Tu ubicación está compartida':'Comparte tu ubicación aproximada'}</strong><span>{mine?<><Clock3 size={13}/> {timeLeft(mine.expiresAt)}</>:'Se borrará automáticamente en 30 minutos.'}</span></div></div>
   {mine?<button className="outline map-stop" disabled={busy} onClick={onStop}><StopCircle size={17}/> Dejar de compartir</button>:<button className="primary green" disabled={busy} onClick={onShare}><Share2 size={18}/> {busy?'Obteniendo ubicación…':'Compartir en el mapa'}</button>}
   <p><ShieldCheck size={14}/> La posición se aproxima a unos 100 m, sin marcar la puerta exacta, y se comparte durante 30 minutos.</p>
   {!hasSupabase&&<div className="map-demo-note">Modo demo: se guarda solo en este navegador. Para ver ubicaciones y avisos de otras cuentas, configura Supabase y aplica las migraciones v17.</div>}
   {hasSupabase&&<div className="map-demo-note">Visible para todos los usuarios autenticados de RunaRed, sin filtro por comunidad.</div>}
  </div>
 </section>;
}
