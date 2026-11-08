import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createResidents,filterResidents} from '../src/domain/pond.ts';
import type {Neighbor,Post} from '../src/models/types.ts';

const author:Neighbor={id:'a',name:'Ana',animal:'castor',habitat:'estanque',x:20,y:20,hobby:'',sector:'Prueba',status:'',rating:0};
const viewer:Neighbor={...author,id:'b',name:'Beto'};
const post:Post={id:'p',authorId:'a',kind:'servicio',title:'Ayuda',body:'Ayuda',active:true,createdAt:'2026-11-08T00:00:00Z'};

test('resolver quita la publicación y sus contadores activos, conservando el vecino en Todos',()=>{
 const residents=createResidents([author,viewer],[{...post,active:false}]);
 assert.equal(residents[0].publications.length,0);
 assert.equal(residents[0].serviceCount,0);
 assert.equal(filterResidents(residents,'todos',false,'b').length,2);
 assert.deepEqual(filterResidents(residents,'servicio',false,'b').map(r=>r.neighbor.id),['b']);
 assert.deepEqual(filterResidents(residents,'todos',true,'b').map(r=>r.neighbor.id),['b']);
});

test('resolver una de varias publicaciones conserva una mascota y solo cuenta las activas',()=>{
 const residents=createResidents([author],[{...post,active:false},{...post,id:'p2',kind:'favor'}]);
 assert.equal(residents.length,1);
 assert.equal(residents[0].publications.length,1);
 assert.equal(residents[0].favorCount,1);
 assert.equal(residents[0].serviceCount,0);
});

test('eliminar la última publicación permite volver a publicar sin duplicar el vecino',()=>{
 const empty=createResidents([author],[]);
 assert.equal(empty.length,1);
 assert.equal(empty[0].publications.length,0);
 const next=createResidents([author],[{...post,id:'new'}]);
 assert.equal(next.length,1);
 assert.equal(next[0].publications[0].id,'new');
});
