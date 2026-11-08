import {Compass,Map as MapIcon,Newspaper,Hammer,HeartHandshake,AlertTriangle,HelpCircle} from 'lucide-react';
import {Mascot} from './Mascot';
import {SharedLocationsPanel} from './SharedLocationsPanel';
import type {SharedLocation} from '../services/sharedLocations';
import type {EmergencyAlert} from '../services/emergencyAlerts';
import type {Filter,Neighbor,PondResident,Post,UserProfile} from '../models/types';

type Props={view:'estanque'|'actividad'|'mapa';onViewChange:(view:'estanque'|'actividad'|'mapa')=>void;filter:Filter;onFilterChange:(filter:Filter)=>void;emergency:boolean;visible:PondResident[];neighbors:Neighbor[];posts:Post[];profile:UserProfile|null;locations:SharedLocation[];emergencies:EmergencyAlert[];mapBusy:boolean;mapError:string;onRefresh:()=>void;onShare:()=>void;onStop:()=>void;onSelect:(neighbor:Neighbor)=>void;loading:boolean};
const filters:[Filter,string][]=[['todos','Todos'],['servicio','Servicios'],['favor','Favores'],['emergencia','Emergencias']];
const iconFor=(kind:Post['kind'])=>kind==='servicio'?Hammer:kind==='favor'?HeartHandshake:AlertTriangle;

export function CommunityViews(p:Props){
 const title=(post:Post)=>p.neighbors.find(n=>n.id===post.authorId)?.name||'Vecino';
 return <>
  <div className="view-switch" role="tablist" aria-label="Vistas de comunidad">
   <button role="tab" aria-selected={p.view==='estanque'} className={p.view==='estanque'?'selected':''} onClick={()=>p.onViewChange('estanque')}><Compass size={16}/>Estanque</button>
   <button role="tab" aria-selected={p.view==='actividad'} className={p.view==='actividad'?'selected':''} onClick={()=>p.onViewChange('actividad')}><Newspaper size={16}/>Actividad</button>
   <button role="tab" aria-selected={p.view==='mapa'} className={p.view==='mapa'?'selected':''} onClick={()=>p.onViewChange('mapa')}><MapIcon size={16}/>Mapa</button>
  </div>
  <div className="community-filters" aria-label="Filtrar publicaciones">{filters.map(([value,label])=><button key={value} className={(p.filter===value?'selected ':'')+(p.emergency&&value==='emergencia'?'emergency-filter':'')} onClick={()=>p.onFilterChange(value)}>{label}</button>)}</div>
  {p.loading&&<p className="hint">Cargando publicaciones...</p>}
  {p.view==='estanque'&&<div className="pond-wrap"><div className={'pond habitat-'+(p.profile?.habitat||'estanque')}><div className="habitat-art" aria-hidden="true"/><div className="pond-shape s1"/><div className="pond-shape s2"/><div className="pond-shape s3"/><div className="pond-shape s4"/><div className="zone">ZONA NORTE</div>{p.emergency&&<><div className="rain"/><div className="emergency-banner">⚠ Modo emergencia activo</div></>}{p.visible.map(r=>{const post=r.publications[0];const Icon=post?iconFor(post.kind):HelpCircle;return <button key={r.neighbor.id} className="neighbor" style={{left:r.neighbor.x+'%',top:r.neighbor.y+'%'}} onClick={()=>p.onSelect(r.neighbor)} aria-label={'Ver a '+r.neighbor.name+', '+r.publications.length+' publicaciones'}><span className={'kind-bubble '+(post?.kind||'me')}><Icon size={15}/></span><Mascot animal={r.neighbor.animal}/><span className="nameplate">{r.neighbor.name}</span>{r.publications.length>1&&<span className="post-count">{r.publications.length} publicaciones</span>}</button>})}</div></div>}
  {p.view==='actividad'&&<section className="activity-feed">{p.posts.length===0?<div className="rec-empty">{p.filter==='todos'?'Aún no hay actividad en la comunidad.':'No hay publicaciones en este filtro.'}</div>:p.posts.map(post=>{const Icon=iconFor(post.kind);const author=p.neighbors.find(n=>n.id===post.authorId);return <article className={'activity-card '+post.kind} key={post.id} onClick={()=>author&&p.onSelect(author)}><div className="activity-meta"><span className={'pill '+post.kind}><Icon size={14}/>{post.kind}</span><span>{title(post)}</span></div><h3>{post.title}</h3><p>{post.body}</p>{post.latitude!=null&&post.longitude!=null&&<small>📍 Incluye un punto en el mapa</small>}</article>})}</section>}
  {p.view==='mapa'&&<SharedLocationsPanel locations={p.locations} posts={p.posts} emergencies={p.emergencies} currentUserId={p.profile?.id||''} busy={p.mapBusy} error={p.mapError} onRefresh={p.onRefresh} onShare={p.onShare} onStop={p.onStop}/>}
 </>;
}
