import {useEffect,useRef,useState} from 'react';
import {LngLat,Map as MapLibreMap,Marker,NavigationControl,setWorkerUrl} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import {Check,MapPin,X} from 'lucide-react';
import {requestApproximateLocation,roundApproximateCoordinates} from '../services/location';

setWorkerUrl(workerUrl);

export type MapPoint={latitude:number;longitude:number};
type Props={initialPoint:MapPoint|null;onCancel:()=>void;onChoose:(point:MapPoint)=>void;purpose?:'post'|'recommendation'};

export function LocationPicker({initialPoint,onCancel,onChoose,purpose='post'}:Props){
 const container=useRef<HTMLDivElement>(null);
 const marker=useRef<Marker|null>(null);
 const interacted=useRef(false);
 const locationRequest=useRef<Promise<MapPoint|null>|null>(null);
 const [point,setPoint]=useState<MapPoint|null>(initialPoint);
 const [locationStatus,setLocationStatus]=useState(initialPoint?'':'Buscando tu ubicación para centrar el mapa…');
 useEffect(()=>{
  if(!container.current)return;
  const center=initialPoint?[initialPoint.longitude,initialPoint.latitude] as [number,number]:[-77.0428,-12.0464] as [number,number];
  const map=new MapLibreMap({container:container.current,style:'https://tiles.openfreemap.org/styles/liberty',center,zoom:initialPoint?16:15});
  map.addControl(new NavigationControl({showCompass:false}),'top-right');
  if(initialPoint)marker.current=new Marker({color:'#007c59'}).setLngLat(center).addTo(map);
  map.on('dragstart',()=>{interacted.current=true});
  map.on('zoomstart',()=>{interacted.current=true});
  map.on('click',event=>{
   interacted.current=true;
   const rounded=roundApproximateCoordinates(event.lngLat.lat,event.lngLat.lng);
   setPoint(rounded);
   const coordinates=new LngLat(rounded.longitude,rounded.latitude);
   if(marker.current)marker.current.setLngLat(coordinates);
   else marker.current=new Marker({color:'#007c59'}).setLngLat(coordinates).addTo(map);
  });
  requestAnimationFrame(()=>map.resize());
  let active=true;
  if(!initialPoint){
   locationRequest.current??=requestApproximateLocation();
   void locationRequest.current.then(location=>{
    if(!active)return;
    if(location){
     if(!interacted.current){
      map.flyTo({center:[location.longitude,location.latitude],zoom:16,duration:700});
      setLocationStatus('Mapa centrado cerca de ti. La lectura no se guarda ni se comparte.');
     }else setLocationStatus('Ubicación detectada, pero conservamos la vista que ya estabas ajustando. No se guarda ni se comparte.');
    }else setLocationStatus('No se pudo obtener la ubicación. Puedes mover y acercar el mapa manualmente.');
   });
  }
  return()=>{active=false;marker.current?.remove();marker.current=null;map.remove()};
 },[]);
 return <div className="overlay location-picker-overlay" onClick={onCancel}>
  <section className="sheet location-picker-sheet" onClick={event=>event.stopPropagation()}>
   <div className="sheet-top"><div><div className="eyebrow">{purpose==='post'?'PUNTO DEL AVISO':'LUGAR RECOMENDADO'}</div><h2>{purpose==='post'?'Elige dónde sucede':'Elige el lugar'}</h2></div><button className="close" onClick={onCancel} aria-label="Cerrar"><X size={20}/></button></div>
   <p className="location-picker-help">Si das permiso, centraremos el mapa en tu zona. Esa lectura no se guarda ni se comparte. Mueve el mapa y toca un punto; guardaremos una ubicación aproximada a unos 100 m.</p>
   <div className="location-picker-frame"><div className="location-picker-canvas" ref={container}/><div className="location-picker-hint"><MapPin size={15}/> Toca el mapa para poner el pin</div></div>
   {locationStatus&&<p className="location-picker-status" role="status">{locationStatus}</p>}
   {point&&<p className="location-picker-selected"><MapPin size={15}/> Punto seleccionado: {point.latitude.toFixed(3)}, {point.longitude.toFixed(3)}</p>}
   <p className="location-picker-disclosure">{purpose==='post'?'Este punto aparecerá a todos los usuarios de RunaRed mientras el aviso esté activo.':'La ubicación aproximada aparecerá en el muro de recomendaciones de la comunidad.'}</p>
   <div className="location-picker-actions"><button className="outline" onClick={onCancel}>Cancelar</button><button className="primary green" disabled={!point} onClick={()=>point&&onChoose(point)}><Check size={17}/> Usar este punto</button></div>
  </section>
 </div>;
}
