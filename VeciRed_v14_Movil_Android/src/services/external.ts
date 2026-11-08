/** No se inventan teléfonos. El vecino debe optar por publicar su contacto. */
export function normalizePeruPhone(input:string):string|null {
 const digits=input.replace(/\D/g,'');if(!digits)return null;
 if(/^9\d{8}$/.test(digits))return '51'+digits;
 if(/^519\d{8}$/.test(digits))return digits;
 return null;
}
export function openWhatsApp(phone:string,message:string){
 const valid=normalizePeruPhone(phone);if(!valid)return false;
 window.open(`https://wa.me/${valid}?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer');return true;
}
export async function shareLocation(lat:number,lon:number){
 const url=`https://www.google.com/maps?q=${lat.toFixed(2)},${lon.toFixed(2)}`;
 const message='Mi ubicación aproximada para coordinar ayuda vecinal: '+url;
 try{if(navigator.share){await navigator.share({title:'Ubicación aproximada · VeciRed',text:message});return}}catch{return}
 window.open('https://wa.me/?text='+encodeURIComponent(message),'_blank','noopener,noreferrer');
}
