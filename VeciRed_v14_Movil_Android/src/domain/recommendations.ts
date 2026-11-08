export type Recommendation={id:string;authorId:string;type:'vecino'|'lugar';targetUserId:string|null;title:string;description:string;mapsUrl:string;createdAt:string;tags?:string[];rating?:number|null;category?:string|null;latitude?:number|null;longitude?:number|null};
export type RecommendationInput=Omit<Recommendation,'id'|'createdAt'>;
export function safeMapsUrl(value:string):string{
 const url=value.trim();
 // Keep validation identical to the SQL constraint. No arbitrary redirects or credentials.
 return /^https:\/\/(?:(?:www\.)?google\.com\/maps(?:[/?#]|$)|maps\.google\.com\/|maps\.app\.goo\.gl\/)[^\s]*$/.test(url)?url:'';
}
export function validateRecommendation(input:RecommendationInput):RecommendationInput{
 const title=input.title.trim(),description=input.description.trim(),mapsUrl=input.mapsUrl.trim();
 if(!title||title.length>90)throw new Error('Escribe un título de hasta 90 caracteres.');
 if(description.length>500)throw new Error('La descripción admite hasta 500 caracteres.');
 if(input.type!=='vecino'&&input.type!=='lugar')throw new Error('Tipo de recomendación inválido.');
 if(input.type==='vecino'&&(!input.targetUserId||input.targetUserId===input.authorId))throw new Error('Selecciona a otro vecino para recomendarlo.');
 if(mapsUrl&&!safeMapsUrl(mapsUrl))throw new Error('Utiliza un enlace HTTPS de Google Maps.');
 return {...input,title,description,targetUserId:input.type==='vecino'?input.targetUserId:null,mapsUrl:input.type==='lugar'?mapsUrl:''};
}

export function normalizeTags(tags:string[]):string[]{
 if(!Array.isArray(tags)||tags.length>5)throw new Error('Selecciona hasta cinco etiquetas.');
 const result:string[]=[];
 for(const tag of tags){
  if(typeof tag!=='string')throw new Error('Etiqueta inválida.');
  const value=tag.trim().replace(/\s+/g,' ');
  if(!value||value.length>40)throw new Error('Cada etiqueta debe tener entre 1 y 40 caracteres.');
  if(!result.some(item=>item.toLocaleLowerCase('es')===value.toLocaleLowerCase('es')))result.push(value);
 }
 return result;
}
export function validateV18Recommendation(input:RecommendationInput):RecommendationInput{
 const value=validateRecommendation(input),tags=normalizeTags(input.tags||[]);
 if(!tags.length)throw new Error('Añade al menos una etiqueta.');
 if(value.type==='vecino'){
  if(!Number.isInteger(input.rating)||input.rating!<1||input.rating!>5)throw new Error('Elige una calificación de una a cinco estrellas.');
  return {...value,tags,rating:input.rating,latitude:null,longitude:null,category:null};
 }
 if(typeof input.latitude!=='number'||typeof input.longitude!=='number'||!Number.isFinite(input.latitude)||!Number.isFinite(input.longitude)||Math.abs(input.latitude)>90||Math.abs(input.longitude)>180)throw new Error('Selecciona un lugar válido en el mapa.');
 return {...value,tags,rating:null,category:null,latitude:Math.round(input.latitude*1000)/1000,longitude:Math.round(input.longitude*1000)/1000};
}
