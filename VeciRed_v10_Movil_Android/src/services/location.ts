import { Geolocation } from '@capacitor/geolocation';
/** Solo proximidad aproximada; nunca publicar coordenadas exactas de vecinos. */
export async function requestApproximateLocation():Promise<{latitude:number;longitude:number}|null>{
 try {const pos=await Geolocation.getCurrentPosition({enableHighAccuracy:false,timeout:10000});return {latitude:Math.round(pos.coords.latitude*100)/100,longitude:Math.round(pos.coords.longitude*100)/100};}catch{return null;}
}
