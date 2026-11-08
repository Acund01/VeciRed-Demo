export type Recommendation={id:string;authorId:string;type:'vecino'|'lugar';targetUserId:string|null;title:string;description:string;mapsUrl:string;createdAt:string};
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
