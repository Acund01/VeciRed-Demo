import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizePeruPhone,openPhoneDialer} from '../src/services/external.ts';

test('normaliza un celular peruano para el marcador',()=>{
 assert.equal(normalizePeruPhone('900 000 001'),'51900000001');
 assert.equal(normalizePeruPhone('+51 900 000 001'),'51900000001');
});

test('rechaza números vacíos, incompletos o de otro formato',()=>{
 for(const phone of ['', '123', '800000001', '+1 202 555 0100']){
  assert.equal(normalizePeruPhone(phone),null);
 }
});

test('abre tel con número validado, sin abrir WhatsApp ni iniciar una llamada por API',()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'window');
 const location={href:'https://localhost/'};
 Object.defineProperty(globalThis,'window',{configurable:true,value:{location}});
 try{
  assert.equal(openPhoneDialer('+51 900 000 001'),true);
  assert.equal(location.href,'tel:+51900000001');
  location.href='https://localhost/';
  assert.equal(openPhoneDialer('123'),false);
  assert.equal(location.href,'https://localhost/');
 }finally{
  if(original)Object.defineProperty(globalThis,'window',original);
  else delete globalThis.window;
 }
});
