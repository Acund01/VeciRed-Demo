import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeTags,validateV18Recommendation} from '../src/domain/recommendations.ts';
const recognition={authorId:'a',type:'vecino' as const,targetUserId:'b',title:'Ayuda',description:'Gracias',mapsUrl:'',tags:['Solidaridad'],rating:5};
test('normaliza etiquetas sin duplicados por mayúsculas y comprueba límites',()=>{
 assert.deepEqual(normalizeTags(['  Buen   vecino ','buen vecino','Apoyo']),['Buen vecino','Apoyo']);
 for(const values of [[''],['x'.repeat(41)],Array(6).fill('a'),[null] as unknown as string[]])assert.throws(()=>normalizeTags(values));
});
test('reconocimiento requiere etiquetas, destinatario distinto y estrellas enteras',()=>{
 assert.equal(validateV18Recommendation(recognition).rating,5);
 for(const rating of [null,0,6,1.5])assert.throws(()=>validateV18Recommendation({...recognition,rating}));
 assert.throws(()=>validateV18Recommendation({...recognition,tags:[]}));
 assert.throws(()=>validateV18Recommendation({...recognition,targetUserId:'a'}));
 assert.equal(validateV18Recommendation({...recognition,latitude:-12,longitude:-77}).latitude,null);
});
test('lugar requiere coordenadas válidas y reduce su precisión',()=>{
 const place={...recognition,type:'lugar' as const,latitude:-12.046374,longitude:-77.042793};
 const value=validateV18Recommendation(place);
 assert.equal(value.latitude,-12.046);assert.equal(value.longitude,-77.043);assert.equal(value.rating,null);assert.equal(value.targetUserId,null);
 for(const latitude of [null,NaN,91,Infinity])assert.throws(()=>validateV18Recommendation({...place,latitude}));
});
