import { Geolocation } from '@capacitor/geolocation';
/** Ubicación aproximada a unos 100 m; nunca publicar coordenadas exactas de vecinos. */
export function roundApproximateCoordinates(latitude:number,longitude:number){
 return {latitude:Math.round(latitude*1000)/1000,longitude:Math.round(longitude*1000)/1000};
}
export async function requestApproximateLocation():Promise<{latitude:number;longitude:number}|null>{
 try {const pos=await Geolocation.getCurrentPosition({enableHighAccuracy:false,timeout:10000});return roundApproximateCoordinates(pos.coords.latitude,pos.coords.longitude);}catch{return null;}
}
