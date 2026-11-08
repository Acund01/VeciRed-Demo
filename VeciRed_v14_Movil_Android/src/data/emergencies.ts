export const emergencyContacts=[
 {id:'policia',label:'Policía Nacional',number:'105'},
 {id:'bomberos',label:'Bomberos',number:'116'},
 {id:'defensa',label:'Defensa Civil',number:'115'},
 {id:'samu',label:'SAMU (según cobertura)',number:'106'},
] as const;
type EmergencyContactId = typeof emergencyContacts[number]['id'];
type EmergencyType = {
 readonly id: string;
 readonly icon: string;
 readonly label: string;
 readonly contacts: readonly EmergencyContactId[];
 readonly advice: string;
};
export const emergencyTypes: readonly EmergencyType[]=[
 {id:'sismo',icon:'🏚️',label:'Sismo / terremoto',contacts:['bomberos','defensa','policia','samu'],advice:'Aléjate de estructuras dañadas, evita ascensores y busca una zona segura.'},
 {id:'huayco',icon:'⛰️',label:'Huayco / deslizamiento',contacts:['defensa','bomberos','policia'],advice:'Aléjate de quebradas, riberas y laderas inestables. Evacúa hacia zonas altas seguras.'},
 {id:'incendio',icon:'🔥',label:'Incendio',contacts:['bomberos','policia','samu'],advice:'Evacúa sin exponerte al humo y no regreses al inmueble.'},
 {id:'robo',icon:'🚨',label:'Robo / violencia',contacts:['policia','samu'],advice:'Ponte a salvo. No enfrentes a los agresores. Reporta tu ubicación a las autoridades.'},
 {id:'salud',icon:'🩺',label:'Emergencia médica',contacts:['samu','bomberos'],advice:'Indica la ubicación y síntomas. Sigue las instrucciones del operador.'},
 {id:'inundacion',icon:'🌧️',label:'Inundación',contacts:['defensa','bomberos','policia'],advice:'Evita corrientes de agua y cables eléctricos. Dirígete a un lugar alto.'},
] as const;
