import {Geolocation} from '@capacitor/geolocation';
import {roundApproximateCoordinates} from '../domain/locations';
export {roundApproximateCoordinates} from '../domain/locations';
export async function requestApproximateLocation(){
 try{const position=await Geolocation.getCurrentPosition({enableHighAccuracy:false,timeout:10000});return roundApproximateCoordinates(position.coords.latitude,position.coords.longitude)}
 catch{return null}
}
