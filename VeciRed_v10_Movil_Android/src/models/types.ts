export type Kind = 'servicio'|'favor'|'emergencia';
export type Animal = 'castor'|'cuy'|'vizcacha'|'alpaca';
export type Habitat = 'estanque'|'andes'|'jardin';
export type Filter = 'todos'|Kind;
export type EmergencyResource = 'agua'|'energia'|'alimentos'|'refugio'|'salud'|'transporte'|'otro';
export interface Neighbor { id:string; name:string; animal:Animal; habitat:Habitat; x:number; y:number; hobby:string; sector:string; status:string; rating:number; }
export interface Post { id:string; authorId:string; kind:Kind; title:string; body:string; createdAt:string; active:boolean; resource?:EmergencyResource; }
export interface ChatMessage { id:string; from:string; text:string; createdAt:string; }
export interface UserProfile { id:string; name:string; animal:Animal; habitat:Habitat; hobby:string; sector:string; }
export interface PondResident { neighbor:Neighbor; publications:Post[]; serviceCount:number; favorCount:number; emergencyCount:number; }
