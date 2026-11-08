export type MapPoint={latitude:number;longitude:number};
/** Three decimal degrees: roughly 100 m, not a guarantee of anonymity. */
export function roundApproximateCoordinates(latitude:number,longitude:number):MapPoint{
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude < -90||latitude > 90||longitude < -180||longitude > 180)throw new Error('Coordenadas inválidas.');
 return {latitude:Math.round(latitude*1000)/1000,longitude:Math.round(longitude*1000)/1000};
}
export function activeLocations<T extends {expiresAt:string}>(rows:T[],now=Date.now()):T[]{
 return rows.filter(row=>Date.parse(row.expiresAt)>now);
}
