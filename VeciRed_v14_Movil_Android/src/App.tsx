import {lazy,Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {AlertTriangle,ArrowLeft,Check,ChevronRight,HeartHandshake,Hammer,HelpCircle,MapPin,Map as MapIcon,MessageCircle,Moon,Plus,ShieldCheck,Sun,Phone,X, Droplets, Zap, HandHeart, LogOut, House, Share2, Star, Compass, Navigation, Users, BadgeCheck, LoaderCircle} from 'lucide-react';
import {Mascot} from './components/Mascot';
import {neighbors,posts as seedPosts} from './data/demo';
import {createResidents,filterResidents,visiblePosts} from './domain/pond';
import {hasSupabase,signIn,signUp,signOut,restoreSession} from './infrastructure/supabase';
import {neighborhoodGateway,profileGateway,contactGateway} from './infrastructure/supabaseGateway';
import {openWhatsApp,openPhoneDialer,shareLocation,normalizePeruPhone} from './services/external';
import {emergencyTypes,emergencyContacts} from './data/emergencies';
import {repository} from './services/repository';
import {recommendationGateway} from './infrastructure/recommendations';
import type {Recommendation} from './infrastructure/recommendations';
import {safeMapsUrl} from './domain/recommendations';
import {requestApproximateLocation} from './services/location';
import {sharedLocationGateway} from './services/sharedLocations';
import type {SharedLocation} from './services/sharedLocations';
import type {MapPoint} from './domain/locations';
const SharedLocationsPanel=lazy(()=>import('./components/SharedLocationsPanel').then(module=>({default:module.SharedLocationsPanel})));
const LocationPicker=lazy(()=>import('./components/LocationPicker').then(module=>({default:module.LocationPicker})));
import type {Animal,Filter,Habitat,Kind,Neighbor,Post,UserProfile,EmergencyResource} from './models/types';
const kinds:Record<Kind,{name:string;icon:typeof Hammer}>={servicio:{name:'Servicio',icon:Hammer},favor:{name:'Favor',icon:HeartHandshake},emergencia:{name:'Emergencia',icon:AlertTriangle}};
const animals:Animal[]=['castor','cuy','gallito','llama','vicuna','oso','vizcacha','alpaca'];
const habitats:Habitat[]=['estanque','andes','bosque','costa','valle','nublado','jardin'];
const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
function IconFor({kind}:{kind:Kind}){const Icon=kinds[kind].icon;return <Icon size={16} strokeWidth={2.3}/>}
export default function App(){
 const [profile,setProfile]=useState<UserProfile|null>(()=>hasSupabase?null:repository.getProfile());
 const [screen,setScreen]=useState<'intro'|'login'|'guide'|'home'>(()=>!hasSupabase&&repository.getProfile()?'home':'intro');
 const [filter,setFilter]=useState<Filter>('todos');const [section,setSection]=useState<'comunidad'|'recomendaciones'|'mapa'>('comunidad');const [recommendations,setRecommendations]=useState<Recommendation[]>([]);const [recommendOpen,setRecommendOpen]=useState(false);const [recType,setRecType]=useState<'vecino'|'lugar'>('vecino');const [recTarget,setRecTarget]=useState('');const [recTitle,setRecTitle]=useState('');const [recDescription,setRecDescription]=useState('');const [recMaps,setRecMaps]=useState('');const [recBusy,setRecBusy]=useState(false);const [confirmEmergency,setConfirmEmergency]=useState(false);const [emergency,setEmergency]=useState(false);
 const [dark,setDark]=useState(repository.getDark);const [selected,setSelected]=useState<Neighbor|null>(null);
 const [publish,setPublish]=useState(false);const [kind,setKind]=useState<Kind>('servicio');const [draft,setDraft]=useState('');const [resource,setResource]=useState<EmergencyResource>('agua');
 const [postList,setPostList]=useState<Post[]>(()=>hasSupabase?[]:repository.getPosts(seedPosts));const [remoteNeighbors,setRemoteNeighbors]=useState<Neighbor[]>([]);const [loadingData,setLoadingData]=useState(false);const [dataError,setDataError]=useState('');
 const [pendingDelete,setPendingDelete]=useState<Post|null>(null);const [postActionError,setPostActionError]=useState('');const postMutation=useRef(false);
 const [syncError,setSyncError]=useState('');const [refreshVersion,setRefreshVersion]=useState(0);
 const [settings,setSettings]=useState(false);const [emergencyPanel,setEmergencyPanel]=useState(false);const [incident,setIncident]=useState('sismo');const [phone,setPhone]=useState('');const [saving,setSaving]=useState(false);
 const [callSettings,setCallSettings]=useState<{hasPhone:boolean;allowed:boolean}|null>(null);const [callSettingsBusy,setCallSettingsBusy]=useState(false);const [callSettingsError,setCallSettingsError]=useState('');const [callSettingsVersion,setCallSettingsVersion]=useState(0);const callRequest=useRef(false);
 const [sharedLocations,setSharedLocations]=useState<SharedLocation[]>([]);const [mapBusy,setMapBusy]=useState(false);const [mapError,setMapError]=useState('');const [mapVersion,setMapVersion]=useState(0);const mapMutation=useRef(false);
 const [postLocation,setPostLocation]=useState<MapPoint|null>(null);const [locationPickerOpen,setLocationPickerOpen]=useState(false);
 const [locationState,setLocationState]=useState('Ubicación no compartida');const [contactBusy,setContactBusy]=useState(false);
 const [name,setName]=useState('');const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [authMode,setAuthMode]=useState<'login'|'register'>('login');const [authError,setAuthError]=useState('');const [authBusy,setAuthBusy]=useState(false);const [newAnimal,setNewAnimal]=useState<Animal>('castor');const [newHabitat,setNewHabitat]=useState<Habitat>('estanque');const [hobby,setHobby]=useState('');
 useEffect(()=>{if(!hasSupabase)repository.savePosts(postList)},[postList]);useEffect(()=>{repository.saveDark(dark)},[dark]);
 useEffect(()=>{if(!hasSupabase)return;let active=true;restoreSession().then(p=>{if(active&&p){setProfile(p);setScreen('home')}}).catch(()=>{if(active){repository.logout();setProfile(null);setScreen('intro')}});return()=>{active=false}},[]);
 useEffect(()=>{
  if(!hasSupabase||!profile||screen!=='home'||saving){setLoadingData(false);return}
  let active=true;let inFlight=false;
  const sector=profile.sector;
  const offlineMessage='Sin conexión. Tus datos visibles se conservan; se actualizarán al recuperar internet.';
  const onOffline=()=>{if(active){setSyncError(offlineMessage);setLoadingData(false)}};
  const refresh=async()=>{
   if(!active||inFlight||document.visibilityState==='hidden')return;
   if(!navigator.onLine){onOffline();return}
   inFlight=true;
   setLoadingData(true);
   let timeout:ReturnType<typeof setTimeout>|undefined;
   try{
    const [ns,ps]=await Promise.race([
     Promise.all([neighborhoodGateway.listNeighbors(sector),neighborhoodGateway.listPosts(sector)]),
     new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Tiempo de conexión agotado')),12000)})
    ]);
    if(active&&navigator.onLine){setRemoteNeighbors(ns);setPostList(ps);setSyncError('')}
   }catch{
    if(active)setSyncError('No se pudo actualizar el estanque. Revisa tu conexión; tus datos visibles se conservan.');
   }finally{
    clearTimeout(timeout);
    inFlight=false;
    if(active)setLoadingData(false);
   }
  };
  const onVisible=()=>{if(document.visibilityState==='visible')void refresh()};
  void refresh();
  const timer=window.setInterval(()=>void refresh(),15000);
  document.addEventListener('visibilitychange',onVisible);
  window.addEventListener('online',onVisible);
  window.addEventListener('offline',onOffline);
  return()=>{
   active=false;window.clearInterval(timer);
   document.removeEventListener('visibilitychange',onVisible);
   window.removeEventListener('online',onVisible);
   window.removeEventListener('offline',onOffline);
  };
 },[profile?.id,profile?.sector,screen,saving,refreshVersion]);
 useEffect(()=>{
  if(!settings||!profile)return;
  setCallSettings(null);setCallSettingsError('');
  if(!hasSupabase){setCallSettingsBusy(false);return}
  let active=true;setCallSettingsBusy(true);
  contactGateway.getCallSettings().then(value=>{if(active)setCallSettings(value)})
   .catch(()=>{if(active)setCallSettingsError('Las preferencias de llamadas no están disponibles. Intenta de nuevo más tarde.')})
   .finally(()=>{if(active)setCallSettingsBusy(false)});
  return()=>{active=false};
 },[settings,profile?.id,callSettingsVersion]);

 const [recError,setRecError]=useState('');const [recLoading,setRecLoading]=useState(false);const [recVersion,setRecVersion]=useState(0);
 useEffect(()=>{
  if(!profile||screen!=='home'||section!=='recomendaciones'||recBusy)return;
  let active=true;let busy=false;
  const refresh=async()=>{
   if(busy||document.visibilityState==='hidden')return;
   if(!navigator.onLine){setRecError('Sin conexión. Las recomendaciones visibles se conservan.');return}
   busy=true;setRecLoading(true);
   try{const rows=await recommendationGateway.list();if(active){setRecommendations(rows);setRecError('')}}
   catch{if(active)setRecError('No se pudieron cargar las recomendaciones. Revisa tu conexión o inténtalo de nuevo más tarde.')}
   finally{busy=false;if(active)setRecLoading(false)}
  };
  const onVisible=()=>{if(document.visibilityState==='visible')void refresh()};
  void refresh();const timer=window.setInterval(()=>void refresh(),15000);
  window.addEventListener('online',onVisible);document.addEventListener('visibilitychange',onVisible);
  return()=>{active=false;window.clearInterval(timer);window.removeEventListener('online',onVisible);document.removeEventListener('visibilitychange',onVisible)};
 },[profile?.id,screen,section,recBusy,recVersion]);
 useEffect(()=>{
  if(!profile||screen!=='home'||section!=='mapa'||mapBusy)return;
  let active=true;let inFlight=false;
  const refresh=async()=>{
   if(inFlight||document.visibilityState==='hidden')return;
   if(!navigator.onLine){setMapError('Sin conexión. Las ubicaciones visibles se conservan hasta que venzan.');return}
   inFlight=true;
   try{const rows=await sharedLocationGateway.list();if(active){setSharedLocations(rows);setMapError('')}}
   catch{if(active)setMapError('No se pudieron actualizar las ubicaciones. Inténtalo de nuevo.')}
   finally{inFlight=false}
  };
  const onVisible=()=>{if(document.visibilityState==='visible')void refresh()};
  void refresh();const timer=window.setInterval(()=>void refresh(),15000);
  const expiry=window.setInterval(()=>setSharedLocations(rows=>rows.filter(row=>Date.parse(row.expiresAt)>Date.now())),10000);
  window.addEventListener('online',onVisible);document.addEventListener('visibilitychange',onVisible);
  return()=>{active=false;window.clearInterval(timer);window.clearInterval(expiry);window.removeEventListener('online',onVisible);document.removeEventListener('visibilitychange',onVisible)};
 },[profile?.id,screen,section,mapBusy,mapVersion]);
 useEffect(()=>{if(!publish){setPostLocation(null);setLocationPickerOpen(false)}},[publish]);
 const allNeighbors=useMemo(()=>{const base=hasSupabase?remoteNeighbors:neighbors;return profile?[...base.filter(n=>n.id!==profile.id),{id:profile.id,name:profile.name,animal:profile.animal,habitat:profile.habitat,x:47,y:66,hobby:profile.hobby,sector:profile.sector,status:'¡Hola, vecinos!',rating:0,phone:profile.phone}]:base},[profile,remoteNeighbors]);
 const residents=useMemo(()=>createResidents(allNeighbors,postList),[allNeighbors,postList]);
 const visible=useMemo(()=>filterResidents(residents,filter,emergency,profile?.id),[residents,filter,emergency,profile?.id]);
 const enterPreview=()=>{if(name.trim().length<2)return;if(phone.trim()&&!normalizePeruPhone(phone)){setAuthError('WhatsApp: ingresa 9 dígitos de celular peruano o déjalo vacío.');return}const p:UserProfile={id:'me',name:name.trim(),animal:newAnimal,habitat:newHabitat,hobby:hobby.trim(),sector:'Zona Norte',phone:normalizePeruPhone(phone)||undefined};repository.saveProfile(p);setProfile(p);setScreen('guide');};
 const submitAuth=async()=>{setAuthError('');if(phone.trim()&&!normalizePeruPhone(phone)&&authMode==='register'){setAuthError('WhatsApp: ingresa 9 dígitos de celular peruano o déjalo vacío.');return}setAuthBusy(true);try{if(authMode==='register'){if(name.trim().length<2)throw new Error('Escribe tu nombre.');await signUp(email,password,name.trim(),normalizePeruPhone(phone)||undefined,newAnimal,newHabitat,hobby.trim());setAuthMode('login');setAuthError('Revisa tu correo para confirmar la cuenta y luego inicia sesión.');}else{const p=await signIn(email,password);repository.saveProfile(p);setProfile(p);setScreen('guide')}}catch(e){setAuthError(e instanceof Error?e.message:'No se pudo iniciar sesión')}finally{setAuthBusy(false)}};
 const addPost=async()=>{if(!draft.trim()||!profile||saving)return;setSaving(true);setDataError('');try{const input={authorId:profile.id,kind,title:draft.trim().slice(0,48),body:draft.trim(),resource:kind==='emergencia'?resource:undefined,active:true,latitude:postLocation?.latitude,longitude:postLocation?.longitude};const post=hasSupabase?await neighborhoodGateway.createPost(input):{...input,id:uid(),createdAt:new Date().toISOString()};setPostList(old=>[post,...old]);setDraft('');setPublish(false);setSection('comunidad');setFilter(kind);setEmergency(kind==='emergencia')}catch(e){setDataError(e instanceof Error?e.message:'No se pudo publicar')}finally{setSaving(false)}};
 const changePost=async(post:Post,action:'resolve'|'delete')=>{
  if(!profile||post.authorId!==profile.id||saving||postMutation.current)return;
  postMutation.current=true;setSaving(true);setPostActionError('');
  try{
   if(hasSupabase){
    if(action==='delete')await neighborhoodGateway.deletePost(post.id);
    else await neighborhoodGateway.closePost(post.id);
   }
   setPostList(old=>action==='delete'?old.filter(p=>p.id!==post.id):old.map(p=>p.id===post.id?{...p,active:false}:p));
   setPendingDelete(null);
  }catch{
   setPostActionError(action==='delete'?'No se pudo eliminar. Comprueba tu conexión y el permiso de eliminación en Supabase.':'No se pudo marcar como resuelta. Revisa tu conexión y vuelve a intentarlo.');
  }finally{postMutation.current=false;setSaving(false)}
 };
 useEffect(()=>{setPostActionError('');setPendingDelete(null)},[selected?.id]);
 const addRecommendation=async()=>{if(!profile||!recTitle.trim()||recBusy)return;if(recType==='vecino'&&!recTarget)return;setRecBusy(true);try{const row=await recommendationGateway.create({authorId:profile.id,type:recType,targetUserId:recType==='vecino'?recTarget:null,title:recTitle.trim(),description:recDescription.trim(),mapsUrl:recType==='lugar'?recMaps.trim():''});setRecommendations(old=>[row,...old]);setRecommendOpen(false);setRecTitle('');setRecDescription('');setRecMaps('');setRecTarget('');setSection('recomendaciones')}catch(e){window.alert(e instanceof Error?e.message:'No se pudo recomendar')}finally{setRecBusy(false)}};
 const updateProfile=async(p:UserProfile)=>{if(hasSupabase){try{p=await profileGateway.updatePreferences(p.id,{animal:p.animal,habitat:p.habitat,hobby:p.hobby,phone:p.phone})}catch(e){setDataError(e instanceof Error?e.message:'No se pudo actualizar el perfil');return}}repository.saveProfile(p);setProfile(p)};
 const activateLocation=async()=>{const pos=await requestApproximateLocation();setLocationState(pos?'Ubicación aproximada lista para compartir':'Ubicación no disponible');if(pos)await shareLocation(pos.latitude,pos.longitude)};
 const shareOnMap=async()=>{
  if(!profile||mapMutation.current)return;
  mapMutation.current=true;setMapBusy(true);setMapError('');
  try{
   const pos=await requestApproximateLocation();
   if(!pos){setMapError('No se pudo obtener tu ubicación. Revisa el permiso de ubicación o inténtalo de nuevo.');return}
   await sharedLocationGateway.share(profile,pos.latitude,pos.longitude);
   setMapVersion(v=>v+1);
  }catch{setMapError('No se pudo compartir tu ubicación. Revisa tu conexión e inténtalo de nuevo.')}
  finally{mapMutation.current=false;setMapBusy(false)}
 };
 const stopSharingOnMap=async()=>{
  if(!profile||mapMutation.current)return;
  mapMutation.current=true;setMapBusy(true);setMapError('');
  try{await sharedLocationGateway.stopSharing(profile.id);setSharedLocations(rows=>rows.filter(row=>row.userId!==profile.id));setMapVersion(v=>v+1)}
  catch{setMapError('No se pudo dejar de compartir. Revisa tu conexión y vuelve a intentarlo.')}
  finally{mapMutation.current=false;setMapBusy(false)}
 };
 const contactNeighbor=async(n:Neighbor)=>{if(contactBusy)return;setContactBusy(true);try{const number=hasSupabase?await contactGateway.getWhatsApp(n.id):n.phone;if(!number){window.alert('Este vecino no ha habilitado WhatsApp.');return}openWhatsApp(number,`Hola ${n.name}, te contacto desde RunaRed por tus publicaciones.`)}catch(e){window.alert(e instanceof Error?e.message:'No se pudo contactar')}finally{setContactBusy(false)}};
 const changeCallConsent=async(allowed:boolean)=>{
  if(!callSettings||callSettingsBusy||!callSettings.hasPhone||callRequest.current)return;
  callRequest.current=true;setCallSettingsBusy(true);setCallSettingsError('');
  try{
   await contactGateway.setCallConsent(allowed);
   setCallSettings(old=>old?{...old,allowed}:old);
  }catch{setCallSettingsError('No se pudo guardar el permiso. Revisa tu conexión e inténtalo de nuevo.')}
  finally{callRequest.current=false;setCallSettingsBusy(false)}
 };
 const callNeighbor=async(n:Neighbor)=>{
  if(contactBusy||callRequest.current)return;
  callRequest.current=true;setContactBusy(true);
  try{
   const number=await contactGateway.getCallPhone(n.id);
   if(!number){window.alert('Este vecino no ha autorizado llamadas o no tiene un teléfono registrado.');return}
   if(!openPhoneDialer(number))window.alert('El teléfono registrado no es válido.');
  }catch{window.alert('No se pudo abrir el contacto para llamadas. Revisa tu conexión e inténtalo más tarde.')}
  finally{callRequest.current=false;setContactBusy(false)}
 };
 const leaveApp=()=>{setSettings(false);setSelected(null);setScreen('intro')};
 const logout=async()=>{try{await signOut();repository.logout();setEmail('');setPassword('');setName('');setPhone('');setAuthError('');setProfile(null);setRemoteNeighbors([]);setPostList([]);setSelected(null);setSettings(false);setAuthMode('login');setRecommendations([]);setRecError('');setSharedLocations([]);setMapError('');setPublish(false);setSection('comunidad');setScreen('intro')}catch{window.alert('No se pudo cerrar sesión. Revisa tu conexión e inténtalo de nuevo.')}};
 return <div className={'app '+(dark?'dark ':'')+(emergency?'emergency ':'')}>
 {screen==='intro'&&<main className="intro"><div className="intro-top"><b>RUNARED</b><span>beta</span></div><div className="intro-hero"><div className="hero-orb"><img className="brand-icon" src="/assets/runared-logo.png" alt="Logo RunaRed"/></div><div className="eyebrow">TU RED VECINAL</div><h1>Juntos construimos<br/>un lugar mejor.</h1><p>Conecta con tus vecinos, comparte lo que sabes y cuidémonos en comunidad.</p></div><button className="primary orange" onClick={()=>setScreen('login')}>Entrar al estanque <ChevronRight size={19}/></button><small>Solo para vecinos de la comunidad</small></main>}
 {screen==='login'&&<main className="auth"><button className="back" onClick={()=>setScreen('intro')}><ArrowLeft size={20}/></button><div className="auth-avatar"><Mascot size="large"/></div><div className="eyebrow">RUNARED</div><h1>¡Hola, vecino!</h1><p>Tu comunidad comienza aquí.</p>{hasSupabase&&<div className="auth-switch"><button className={authMode==='login'?'chosen':''} onClick={()=>setAuthMode('login')}>Ingresar</button><button className={authMode==='register'?'chosen':''} onClick={()=>setAuthMode('register')}>Crear cuenta</button></div>}{hasSupabase&&<><label>Correo electrónico<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="vecino@correo.com"/></label><label>Contraseña<input type="password" autoComplete={authMode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo 6 caracteres"/></label></>}{(!hasSupabase||authMode==='register')&&<><label>Tu nombre <input maxLength={40} placeholder="Ej. Ana Torres" value={name} onChange={e=>setName(e.target.value)}/></label><label>Elige tu animalito</label><div className="choices">{animals.map(a=><button key={a} className={newAnimal===a?'chosen':''} onClick={()=>setNewAnimal(a)}><Mascot animal={a}/><span>{a}</span></button>)}</div><label>Hábitat</label><div className="habitat-options">{habitats.map(h=><button key={h} className={newHabitat===h?'chosen':''} onClick={()=>setNewHabitat(h)}>{h}</button>)}</div><label>Afición (opcional)<input value={hobby} maxLength={60} placeholder="Ej. Jardinería" onChange={e=>setHobby(e.target.value)}/></label><label>Número de WhatsApp (opcional, privado hasta contactar)<input type="tel" inputMode="tel" value={phone} maxLength={16} placeholder="Ej. 987654321" onChange={e=>setPhone(e.target.value)}/><small>Se consultará al tocar «Contactar por WhatsApp». El destinatario verá tu número al escribirle.</small></label></>}{authError&&<p className="auth-message" role="status">{authError}</p>}{hasSupabase?<button className="primary green" disabled={authBusy||!email||password.length<6||(authMode==='register'&&name.trim().length<2)} onClick={submitAuth}>{authBusy?'Procesando...':authMode==='login'?'Ingresar':'Crear cuenta'} <ChevronRight size={18}/></button>:<><button className="primary green" disabled={name.trim().length<2} onClick={enterPreview}>Explorar demostración <ChevronRight size={18}/></button><p className="hint">Modo de vista previa: sin cuentas reales. Para activar el acceso con Supabase, configura el archivo .env y el backend.</p></>}</main>}
 {screen==='guide'&&<div className="guide-back"><div className="guide-card"><div className="guide-bubble"><Mascot size="large" animal={profile?.animal}/></div><div className="eyebrow">CASTOR GUÍA</div><h2>¡Bienvenido a tu estanque!</h2><p>Aquí cada vecino aporta algo. Toca un animalito para conocerlo, usa los filtros para explorar y publica cuando tengas algo que compartir.</p><p className="trust"><ShieldCheck size={17}/> Un espacio de confianza vecinal</p><button className="primary green" onClick={()=>setScreen('home')}>Empezar a explorar <ChevronRight size={18}/></button></div></div>}
 {screen==='home'&&<><header className="header"><div><div className="brand"><img src="/assets/runared-logo.png" alt=""/> RunaRed</div><h2>Buenos días, vecino</h2></div><div className="header-actions"><button className="alert-btn" aria-label="Emergencias y números de ayuda" onClick={()=>setEmergencyPanel(true)}><AlertTriangle size={22}/></button><button className="alert-btn" aria-label="Mi perfil" onClick={()=>setSettings(true)}><Users size={21}/></button></div></header><div className="connected"><span><MapPin size={15}/> {profile?.sector||'Zona Norte'} · {allNeighbors.length} vecinos</span><span className="live sync-indicator" role="status" aria-live="polite">{loadingData?<><LoaderCircle size={14} className="loading-spinner" aria-hidden="true"/> Actualizando…</>:<>● {hasSupabase?'Comunidad':'Demo'}</>}</span></div><div className="view-switch" role="tablist" aria-label="Cambiar entre estanque y mapa"><button role="tab" aria-selected={section==='comunidad'} className={section==='comunidad'?'selected':''} onClick={()=>{setSection('comunidad');setFilter('todos');setEmergency(false)}}><Compass size={16}/>Estanque</button><button role="tab" aria-selected={section==='mapa'} className={section==='mapa'?'selected':''} onClick={()=>setSection('mapa')}><MapIcon size={16}/>Mapa</button></div>{syncError&&<div className="auth-message" role="status"><p>{syncError}</p><button className="outline" disabled={loadingData} onClick={()=>setRefreshVersion(v=>v+1)}>Reintentar</button></div>}{dataError&&<p className="auth-message" role="alert">{dataError}</p>}{section==='mapa'&&<Suspense fallback={<p role="status">Cargando mapa…</p>}><SharedLocationsPanel locations={sharedLocations} posts={postList} currentUserId={profile?.id||''} busy={mapBusy} error={mapError} onRefresh={()=>setMapVersion(v=>v+1)} onShare={()=>void shareOnMap()} onStop={()=>void stopSharingOnMap()}/></Suspense>}{section==='recomendaciones'&&<section className="recommendations-panel"><div className="rec-heading"><h3>Recomendaciones de la comunidad</h3><button onClick={()=>setRecommendOpen(true)}><Plus size={16}/> Recomendar</button></div><p>Reconoce a un vecino que te ayudó o comparte un lugar útil de tu zona.</p>{recLoading&&<p role="status">Cargando recomendaciones…</p>}{recError&&<div className="auth-message" role="alert"><p>{recError}</p><button className="outline" onClick={()=>setRecVersion(v=>v+1)}>Reintentar</button></div>}{!recLoading&&!recError&&recommendations.length===0&&<div className="rec-empty">Todavía no hay recomendaciones. ¡Sé el primero!</div>}{recommendations.map(r=><article key={r.id} className="rec-card"><span>{r.type==='vecino'?'🌟 Vecino recomendado':'📍 Lugar recomendado'}</span><h4>{r.title}</h4><p>{r.description}</p>{safeMapsUrl(r.mapsUrl)&&<a href={safeMapsUrl(r.mapsUrl)} target="_blank" rel="noopener noreferrer"><Navigation size={15}/> Abrir en Maps</a>}</article>)}</section>}{section==='comunidad'&&<div className="pond-wrap"><div className={'pond habitat-'+(profile?.habitat||'estanque')}><div className="habitat-art" aria-hidden="true"/><div className="pond-shape s1"/><div className="pond-shape s2"/><div className="pond-shape s3"/><div className="pond-shape s4"/><div className="zone">ZONA NORTE</div>{emergency&&<><div className="rain"/><div className="emergency-banner">⚠ Modo emergencia activo</div></>}{visible.map(r=>{const n=r.neighbor;const matches=visiblePosts(r,filter,emergency);const post=matches[0];return <button key={n.id} className="neighbor" style={{left:n.x+'%',top:n.y+'%'}} onClick={()=>setSelected(n)} aria-label={'Ver a '+n.name+', '+r.publications.length+' publicaciones'}><span className={'kind-bubble '+(post?.kind||'me')}><span>{post?<IconFor kind={post.kind}/>:<HelpCircle size={15}/>}</span></span><Mascot animal={n.animal}/><span className="nameplate">{n.name}</span>{r.publications.length>1&&<span className="post-count">{r.publications.length} publicaciones</span>}</button>})}</div></div>}<div className="bottom-tools"><button onClick={()=>setSettings(true)}><Users size={16}/> Mi perfil</button><button onClick={activateLocation}><Share2 size={16}/> Compartir ubicación</button><button onClick={()=>setDark(d=>!d)}>{dark?<Sun size={16}/>:<Moon size={16}/>} {dark?'Día':'Noche'}</button></div><div className="footnote">{locationState} · Comparte tu ubicación solo si lo decides.</div><nav className="tabs bottom-nav" aria-label="Navegación principal"><button className={section==='comunidad'&&filter==='todos'&&!emergency?'active all':''} onClick={()=>{setSection('comunidad');setFilter('todos');setEmergency(false)}}><Compass size={18}/>Todos</button><button className={section==='comunidad'&&filter==='servicio'&&!emergency?'active service':''} onClick={()=>{setSection('comunidad');setFilter('servicio');setEmergency(false)}}><Hammer size={18}/>Servicios</button><button className={section==='comunidad'&&filter==='favor'&&!emergency?'active favor':''} onClick={()=>{setSection('comunidad');setFilter('favor');setEmergency(false)}}><HeartHandshake size={18}/>Favores</button><button className={section==='recomendaciones'?'active rec':''} onClick={()=>setSection('recomendaciones')}><Star size={18}/>Recomendar</button><button className="add" onClick={()=>{setKind('servicio');setPublish(true)}} aria-label="Nueva publicación"><Plus size={23}/>Publicar</button></nav></>}
 {selected&&<div className="overlay" onClick={()=>setSelected(null)}><section className="sheet" onClick={e=>e.stopPropagation()}><div className="handle"/><div className="person-head"><div className="person-icon"><Mascot animal={selected.animal}/></div><div><h3>{selected.name}</h3><span>{selected.hobby||'Vecino de la comunidad'}</span></div><button className="close" onClick={()=>setSelected(null)} aria-label="Cerrar"><X size={20}/></button></div>{selected.id!==profile?.id&&<div className="rating"><b>RECONOCIMIENTO VECINAL</b><span>Recomienda a esta persona si has tenido una buena experiencia.</span><button className="mini-recommend" onClick={()=>{setRecType('vecino');setRecTarget(selected.id);setRecTitle('Recomiendo a '+selected.name);setSelected(null);setRecommendOpen(true)}}><BadgeCheck size={16}/> Dar reconocimiento</button></div>}<div className="label">PUBLICACIONES ACTIVAS · {postList.filter(p=>p.authorId===selected.id&&p.active).length}</div>{postList.filter(p=>p.authorId===selected.id&&(p.active||selected.id===profile?.id)).map(p=><div className="post-mini" key={p.id}><span className={'pill '+p.kind}><IconFor kind={p.kind}/>{kinds[p.kind].name}</span><b>{p.title}</b><p>{p.body}</p>{!p.active&&<p className="resolved-label">Resuelta · guardada en tu historial</p>}{p.authorId===profile?.id&&<div className="post-actions">{p.active&&<button className="outline" disabled={saving} onClick={()=>void changePost(p,'resolve')}><Check size={16}/> Marcar como resuelta</button>}<button className="outline delete-post" disabled={saving} onClick={()=>{setPostActionError('');setPendingDelete(p)}}>Eliminar publicación</button></div>}</div>)}{!postList.some(p=>p.authorId===selected.id&&p.active)&&<p className="muted">Sin publicaciones activas.</p>}{saving&&<p role="status">Guardando cambios…</p>}{postActionError&&!pendingDelete&&<p className="auth-message" role="alert">{postActionError}</p>}<button className="primary green" onClick={()=>void contactNeighbor(selected)} disabled={contactBusy||(!hasSupabase&&!selected.phone)}><MessageCircle size={18}/> {contactBusy?'Consultando contacto…':hasSupabase||selected.phone?'Contactar por WhatsApp':'WhatsApp no disponible'}</button>{selected.id!==profile?.id&&<button className="outline" disabled={contactBusy||!hasSupabase} onClick={()=>void callNeighbor(selected)}><Phone size={18}/> {contactBusy?'Consultando contacto…':'Llamar'}</button>}<p className="hint">WhatsApp usa el número compartido por el vecino. Las llamadas requieren su autorización adicional y se abren en el marcador del teléfono.</p></section></div>}
 {publish&&<div className="overlay" onClick={()=>setPublish(false)}><section className="sheet publish-sheet" onClick={e=>e.stopPropagation()}><div className="sheet-top"><div><div className="eyebrow">NUEVA PUBLICACIÓN</div><h2>¿Qué quieres compartir?</h2></div><button className="close" onClick={()=>setPublish(false)}><X size={20}/></button></div><div className="kind-choices">{(['servicio','favor','emergencia'] as Kind[]).map(k=><button key={k} className={kind===k?'chosen '+k:''} onClick={()=>setKind(k)}><IconFor kind={k}/><span>{kinds[k].name}</span></button>)}</div>{kind==='emergencia'&&<><label>Tipo de apoyo</label><div className="resource-choices">{([['agua','Agua potable'],['energia','Luz / carga'],['alimentos','Alimentos'],['refugio','Refugio'],['salud','Salud'],['transporte','Transporte'],['otro','Otro']] as [EmergencyResource,string][]).map(([id,label])=><button key={id} className={resource===id?'chosen':''} onClick={()=>setResource(id)}>{label}</button>)}</div></>}<label>Cuéntale algo al barrio<textarea value={draft} onChange={e=>setDraft(e.target.value)} maxLength={500} placeholder={kind==='emergencia'?'Ej: Ofrezco agua potable y un punto de carga...':'Ej: Tengo limones del huerto para compartir...'} rows={3}/></label><button type="button" className="location-option" onClick={()=>setLocationPickerOpen(true)}><MapPin size={17}/>{postLocation?'Cambiar punto del mapa':'Añadir punto al mapa'}<span>{postLocation?'Punto elegido':'Opcional'}</span></button>{postLocation&&<div className="location-selected"><span>{postLocation.latitude.toFixed(3)}, {postLocation.longitude.toFixed(3)} · aprox. 100 m</span><button type="button" onClick={()=>setPostLocation(null)}>Quitar</button></div>}<p className="location-disclosure">Si añades un punto, todos los usuarios de RunaRed podrán verlo en el mapa mientras este aviso esté activo.</p><button className="primary green" disabled={!draft.trim()||saving} onClick={addPost}><Check size={18}/> Publicar en el estanque</button></section></div>}
 {locationPickerOpen&&<Suspense fallback={<div className="overlay"><p className="dialog" role="status">Cargando selector de ubicación…</p></div>}><LocationPicker initialPoint={postLocation} onCancel={()=>setLocationPickerOpen(false)} onChoose={point=>{setPostLocation(point);setLocationPickerOpen(false)}}/></Suspense>}
 {emergencyPanel&&<div className="overlay" onClick={()=>setEmergencyPanel(false)}><section className="sheet emergency-sheet" onClick={e=>e.stopPropagation()}><div className="sheet-top"><div><div className="eyebrow">AYUDA INMEDIATA · PERÚ</div><h2>¿Qué emergencia ocurre?</h2></div><button className="close" onClick={()=>setEmergencyPanel(false)} aria-label="Cerrar"><X size={20}/></button></div><p className="emergency-note">Si hay peligro inmediato, aléjate de la zona y llama a los servicios de emergencia. RunaRed no reemplaza a las autoridades.</p><div className="incident-choices">{emergencyTypes.map(t=><button key={t.id} className={incident===t.id?'chosen':''} onClick={()=>setIncident(t.id)}>{t.icon} {t.label}</button>)}</div><p className="emergency-note">{emergencyTypes.find(t=>t.id===incident)?.advice}</p><div className="emergency-contacts">{emergencyContacts.filter(c=>emergencyTypes.find(t=>t.id===incident)?.contacts.includes(c.id)).map(c=><a key={c.id} className="emergency-phone" href={'tel:'+c.number}><Phone size={18}/><span>{c.label}</span><strong>{c.number}</strong></a>)}</div><button className="primary green" onClick={()=>setConfirmEmergency(true)}><HandHeart size={18}/> Activar modo emergencia</button><button className="outline" onClick={()=>{setKind('emergencia');setPublish(true);setEmergencyPanel(false)}}><Plus size={18}/> Ofrecer ayuda o solicitar apoyo</button><button className="outline" onClick={activateLocation}><Share2 size={18}/> Compartir mi ubicación</button></section></div>}
 {settings&&profile&&<div className="overlay" onClick={()=>setSettings(false)}><section className="sheet settings-sheet" onClick={e=>e.stopPropagation()}><div className="sheet-top"><div><div className="eyebrow">MI PERFIL</div><h2>Tu identidad vecinal</h2></div><button className="close" onClick={()=>setSettings(false)}><X size={20}/></button></div><div className="profile-name"><Mascot animal={profile.animal}/><div><b>{profile.name}</b><small>Nombre fijo para evitar confusiones</small></div></div><label>Elige tu animalito</label><div className="choices">{animals.map(a=><button key={a} className={profile.animal===a?'chosen':''} onClick={()=>updateProfile({...profile,animal:a})}><Mascot animal={a}/><span>{a}</span></button>)}</div><label>Hábitat</label><div className="habitat-options">{habitats.map(h=><button key={h} className={profile.habitat===h?'chosen':''} onClick={()=>updateProfile({...profile,habitat:h})}>{h}</button>)}</div><label>Afición<input value={profile.hobby} maxLength={60} onChange={e=>void updateProfile({...profile,hobby:e.target.value})}/></label><p className="hint">El número de WhatsApp se registra al crear tu cuenta. Para cambiarlo, solicita actualización verificada al equipo de soporte.</p><div className="support call-permission"><h4><Phone size={18}/> Llamadas de vecinos</h4>{!hasSupabase?<p>Disponible con una cuenta real y un teléfono registrado.</p>:<><label className="call-consent"><input type="checkbox" checked={callSettings?.allowed??false} disabled={callSettingsBusy||!callSettings?.hasPhone} onChange={e=>void changeCallConsent(e.target.checked)}/><span>Permitir que los vecinos usen mi número registrado para llamarme</span></label><p>Compartir WhatsApp no activa las llamadas. Puedes retirar este permiso cuando quieras.</p>{callSettingsBusy&&<p role="status">Procesando permiso…</p>}{callSettings&&!callSettings.hasPhone&&<p>No tienes un teléfono registrado.</p>}{callSettingsError&&<><p role="alert">{callSettingsError}</p><button className="outline" disabled={callSettingsBusy} onClick={()=>setCallSettingsVersion(v=>v+1)}>Volver a cargar permiso</button></>}</>}</div><div className="support"><h4><HandHeart size={18}/> Apoyo en emergencias</h4><p>Las publicaciones pueden ofrecer agua potable, luz, carga de dispositivos, refugio o primeros auxilios. Las alertas deben verificarse con el backend.</p><div><Droplets size={16}/> Agua potable <Zap size={16}/> Luz y energía</div></div><button className="outline" onClick={leaveApp}><House size={16}/> Volver a la bienvenida</button><button className="outline" onClick={()=>void logout()}><LogOut size={16}/> Cerrar sesión</button></section></div>}
 {pendingDelete&&<div className="overlay delete-overlay"><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="delete-post-title"><h3 id="delete-post-title">¿Eliminar publicación?</h3><p>«{pendingDelete.title}» se eliminará definitivamente. Si ya recibiste ayuda, puedes cancelar y marcarla como resuelta.</p>{postActionError&&<p className="auth-message" role="alert">{postActionError}</p>}<button className="primary green" disabled={saving} onClick={()=>void changePost(pendingDelete,'delete')}>{saving?'Eliminando…':'Eliminar definitivamente'}</button><button className="outline" disabled={saving} onClick={()=>{setPendingDelete(null);setPostActionError('')}}>Cancelar</button></section></div>}
 {confirmEmergency&&<div className="overlay"><section className="dialog emergency-confirm" role="alertdialog" aria-modal="true"><AlertTriangle size={36} color="#b42336"/><h2>¿Activar modo emergencia?</h2><p>Este modo resalta las solicitudes de ayuda. No envía una alerta masiva por sí solo. No publiques emergencias falsas; si existe peligro inmediato, llama a las autoridades.</p><button className="primary orange" onClick={()=>{setEmergency(true);setSection('comunidad');setFilter('todos');setEmergencyPanel(false);setConfirmEmergency(false)}}>Sí, mostrar ayudas</button><button className="outline" onClick={()=>setConfirmEmergency(false)}>Cancelar</button></section></div>}
 {recommendOpen&&<div className="overlay" onClick={()=>setRecommendOpen(false)}><section className="sheet" onClick={e=>e.stopPropagation()}><div className="sheet-top"><h2>Compartir recomendación</h2><button className="close" onClick={()=>setRecommendOpen(false)}><X/></button></div><div className="kind-choices"><button className={recType==='vecino'?'chosen servicio':''} onClick={()=>setRecType('vecino')}><BadgeCheck/> Reconocer vecino</button><button className={recType==='lugar'?'chosen favor':''} onClick={()=>setRecType('lugar')}><MapPin/> Recomendar lugar</button></div>{recType==='vecino'&&<label>Vecino<select value={recTarget} onChange={e=>setRecTarget(e.target.value)}><option value="">Selecciona un vecino</option>{allNeighbors.filter(n=>n.id!==profile?.id).map(n=><option key={n.id} value={n.id}>{n.name}</option>)}</select></label>}<label>{recType==='lugar'?'Nombre del lugar':'Título del reconocimiento'}<input value={recTitle} onChange={e=>setRecTitle(e.target.value)} maxLength={90} placeholder={recType==='lugar'?'Ej. Tambo del barrio':'Ej. Gran ayuda con la mudanza'}/></label><label>¿Por qué lo recomiendas?<textarea value={recDescription} onChange={e=>setRecDescription(e.target.value)} maxLength={500} rows={3}/></label>{recType==='lugar'&&<label>Enlace de Google Maps (opcional)<input value={recMaps} onChange={e=>setRecMaps(e.target.value)} placeholder="https://maps.google.com/..."/><small>Comparte un enlace de Maps para que los vecinos encuentren el lugar.</small></label>}<button className="primary green" disabled={recBusy||!recTitle.trim()||(recType==='vecino'&&!recTarget)} onClick={()=>void addRecommendation()}><Check size={18}/> Publicar recomendación</button></section></div>}
 </div>;
}
