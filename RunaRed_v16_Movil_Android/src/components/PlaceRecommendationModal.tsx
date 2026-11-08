import {useEffect,useRef} from 'react';
import {Map as MapLibreMap,Marker,NavigationControl,setWorkerUrl} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import {Hash,MapPin,X} from 'lucide-react';
import type {Recommendation} from '../infrastructure/recommendations';

setWorkerUrl(workerUrl);

function areaAround(latitude:number,longitude:number,radiusMeters=120){
 const coordinates:Array<[number,number]>=[];
 for(let degree=0;degree<=360;degree+=8){
  const angle=degree*Math.PI/180;
  const north=radiusMeters*Math.cos(angle)/111320;
  const east=radiusMeters*Math.sin(angle)/(111320*Math.cos(latitude*Math.PI/180));
  coordinates.push([longitude+east,latitude+north]);
 }
 return {type:'Feature' as const,properties:{},geometry:{type:'Polygon' as const,coordinates:[coordinates]}};
}

export function PlaceRecommendationModal({recommendation,onClose}:{recommendation:Recommendation;onClose:()=>void}){
 const container=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!container.current||recommendation.latitude==null||recommendation.longitude==null)return;
  const point:[number,number]=[recommendation.longitude,recommendation.latitude];
  const map=new MapLibreMap({container:container.current,style:'https://tiles.openfreemap.org/styles/liberty',center:point,zoom:15});
  map.addControl(new NavigationControl({showCompass:false}),'top-right');
  map.once('load',()=>{
   map.addSource('recommendation-area',{type:'geojson',data:areaAround(recommendation.latitude!,recommendation.longitude!)});
   map.addLayer({id:'recommendation-area-fill',type:'fill',source:'recommendation-area',paint:{'fill-color':'#ff9d31','fill-opacity':0.25}});
   map.addLayer({id:'recommendation-area-outline',type:'line',source:'recommendation-area',paint:{'line-color':'#d66d00','line-width':3,'line-opacity':0.9}});
  });
  const marker=new Marker({color:'#d66d00'}).setLngLat(point).addTo(map);
  requestAnimationFrame(()=>map.resize());
  return()=>{marker.remove();map.remove()};
 },[recommendation.id,recommendation.latitude,recommendation.longitude]);
 return <div className="overlay place-map-overlay" onClick={onClose}><section className="sheet place-map-sheet" role="dialog" aria-modal="true" aria-labelledby="place-map-title" onClick={event=>event.stopPropagation()}><div className="sheet-top"><div><div className="eyebrow">LUGAR RECOMENDADO</div><h2 id="place-map-title">{recommendation.title}</h2></div><button className="close" onClick={onClose} aria-label="Cerrar mapa"><X size={20}/></button></div>{recommendation.tags.length>0&&<div className="place-modal-tags">{recommendation.tags.map(tag=><span className="place-tag place-tag-large" key={tag}><Hash size={13}/>{tag}</span>)}</div>}{recommendation.description&&<p className="place-map-description">{recommendation.description}</p>}<div className="place-map-frame"><div className="place-map-canvas" ref={container}/><div className="place-map-legend"><MapPin size={14}/> Zona aproximada · radio referencial 120 m</div></div><p className="place-map-note">El pin y el área muestran una ubicación aproximada para cuidar la privacidad.</p><button className="primary green" onClick={onClose}>Volver a recomendaciones</button></section></div>;
}
