import {AlertTriangle,MapPin} from 'lucide-react';
import {emergencyTypes} from '../data/emergencies';
import type {EmergencyAlert} from '../services/emergencyAlerts';

export function EmergencyNotificationStack({alerts,onViewMap}:{alerts:EmergencyAlert[];onViewMap:()=>void}){
 if(!alerts.length)return null;
 return <div className="emergency-notification-stack" aria-live="assertive" aria-relevant="additions">
  {alerts.map(alert=>{const type=emergencyTypes.find(item=>item.id===alert.type);return <article className="emergency-notification" role="alert" key={alert.id}><span className="emergency-notification-icon"><AlertTriangle size={19}/></span><div className="emergency-notification-copy"><strong>{alert.displayName} solicita ayuda</strong><span>{type?.icon} {type?.label||alert.type}</span><small>Aviso visible durante 10 segundos</small></div>{alert.latitude!==null&&alert.longitude!==null&&<button onClick={onViewMap} aria-label="Ver ubicación de la emergencia en el mapa"><MapPin size={18}/></button>}<span className="emergency-notification-progress"/></article>})}
 </div>;
}
