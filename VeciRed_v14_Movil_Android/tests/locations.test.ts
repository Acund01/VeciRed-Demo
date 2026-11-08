import {test} from 'node:test';
import assert from 'node:assert/strict';
import {roundApproximateCoordinates,activeLocations} from '../src/domain/locations.ts';
test('reduce precisión de coordenadas, incluyendo negativas y límites',()=>{
 assert.deepEqual(roundApproximateCoordinates(-12.046374,-77.042793),{latitude:-12.046,longitude:-77.043});
 assert.deepEqual(roundApproximateCoordinates(90,-180),{latitude:90,longitude:-180});
});
test('rechaza coordenadas fuera del planeta o no finitas',()=>{
 for(const [lat,lng] of [[91,0],[0,181],[-91,0],[0,-181],[NaN,0],[0,Infinity]])assert.throws(()=>roundApproximateCoordinates(lat,lng));
});
test('oculta ubicaciones vencidas o inválidas aunque el navegador conserve la lista',()=>{
 const now=Date.parse('2026-11-08T12:00:00Z');
 const rows=[{id:'activa',expiresAt:'2026-11-08T12:01:00Z'},{id:'vencida',expiresAt:'2026-11-08T11:59:00Z'},{id:'limite',expiresAt:'2026-11-08T12:00:00Z'},{id:'invalida',expiresAt:'error'}];
 assert.deepEqual(activeLocations(rows,now).map(row=>row.id),['activa']);
});
