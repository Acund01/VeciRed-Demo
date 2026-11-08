import {test} from 'node:test';
import assert from 'node:assert/strict';
import {safeMapsUrl,validateRecommendation} from '../src/domain/recommendations.ts';
const neighbor={authorId:'ana',type:'vecino' as const,targetUserId:'luis',title:'  Gracias  ',description:'  Ayudó con la mudanza.  ',mapsUrl:''};
test('permite enlaces de Maps y rechaza dominios falsos, redirecciones y protocolos inseguros',()=>{
 for(const url of ['https://www.google.com/maps/place/Lima','https://google.com/maps?x=1','https://maps.google.com/?q=Lima','https://maps.app.goo.gl/abc'])assert.equal(safeMapsUrl(url),url);
 for(const url of ['javascript:alert(1)','http://maps.google.com/','https://google.com/url?q=malicioso','https://maps.google.com.evil.test/','https://maps.google.com@evil.test/','https://evil.test/','https://maps.google.com/\n'])assert.equal(safeMapsUrl(url),url.endsWith('\n')?'https://maps.google.com/':'');
});
test('no permite recomendarse a sí mismo ni publicar sin vecino',()=>{
 assert.throws(()=>validateRecommendation({...neighbor,targetUserId:'ana'}));
 assert.throws(()=>validateRecommendation({...neighbor,targetUserId:null}));
 assert.throws(()=>validateRecommendation({...neighbor,title:' '}));
 assert.throws(()=>validateRecommendation({...neighbor,description:'x'.repeat(501)}));
 assert.equal(validateRecommendation(neighbor).title,'Gracias');
});
test('lugar limpia destinatario y valida enlace; vecino elimina enlace',()=>{
 const place=validateRecommendation({...neighbor,type:'lugar',mapsUrl:'https://maps.app.goo.gl/abc'});
 assert.equal(place.targetUserId,null);assert.equal(place.mapsUrl,'https://maps.app.goo.gl/abc');
 assert.throws(()=>validateRecommendation({...neighbor,type:'lugar',mapsUrl:'https://evil.test/'}));
 assert.equal(validateRecommendation({...neighbor,mapsUrl:'https://maps.google.com/'}).mapsUrl,'');
});
