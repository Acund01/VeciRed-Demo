import type { Neighbor, Post } from '../models/types';
export const neighbors:Neighbor[]=[
{id:'maria',name:'María',animal:'cuy',habitat:'estanque',x:20,y:26,hobby:'Jardinería',sector:'Zona Norte',status:'Reparo cosas del hogar.',rating:4.9},
{id:'carlos',name:'Carlos',animal:'gallito',habitat:'estanque',x:67,y:17,hobby:'Carpintería',sector:'Zona Norte',status:'Ayudo con reparaciones.',rating:4.8},
{id:'ana',name:'Ana',animal:'llama',habitat:'estanque',x:46,y:45,hobby:'Cuidar animales',sector:'Zona Norte',status:'Puedo cuidar peques esta tarde.',rating:5},
{id:'julian',name:'Julián',animal:'vicuna',habitat:'estanque',x:84,y:62,hobby:'Cocina',sector:'Zona Norte',status:'Busco alguien que me ayude con las compras.',rating:4.7},
{id:'sofia',name:'Sofía',animal:'oso',habitat:'estanque',x:23,y:80,hobby:'Voluntariado',sector:'Zona Norte',status:'Puedo compartir agua potable.',rating:5},
{id:'diego',name:'Diego',animal:'castor',habitat:'estanque',x:57,y:81,hobby:'Electricidad',sector:'Zona Norte',status:'Tengo linternas para prestar.',rating:4.9}];
export const posts:Post[]=[
{id:'p1',authorId:'maria',kind:'servicio',title:'Arreglos de hogar',body:'Ayudo con reparaciones sencillas.',createdAt:new Date().toISOString(),active:true},
{id:'p2',authorId:'carlos',kind:'servicio',title:'Carpintería',body:'Reparo muebles y puertas.',createdAt:new Date().toISOString(),active:true},
{id:'p3',authorId:'ana',kind:'favor',title:'Cuidado de niños',body:'Puedo cuidar peques esta tarde.',createdAt:new Date().toISOString(),active:true},
{id:'p4',authorId:'julian',kind:'favor',title:'Compras',body:'¿Alguien me ayuda con las compras?',createdAt:new Date().toISOString(),active:true},
{id:'p5',authorId:'sofia',kind:'emergencia',title:'Agua potable',body:'Puedo compartir agua potable con vecinos que lo necesiten.',createdAt:new Date().toISOString(),active:true},
{id:'p6',authorId:'diego',kind:'emergencia',title:'Luz y linternas',body:'Tengo linternas y una batería portátil para prestar.',createdAt:new Date().toISOString(),active:true}];
