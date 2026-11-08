import type {Animal} from '../models/types';
export function Mascot({animal='castor',size='normal'}:{animal?:Animal;size?:'small'|'normal'|'large'}){
 if(animal==='vizcacha'||animal==='alpaca')return <span className={'mascot mascot-legacy mascot-'+size} role="img" aria-label={animal}>{animal==='vizcacha'?'🐭':'🦙'}</span>;
 return <span className={'mascot-animation mascot-'+size} role="img" aria-label={animal}>{[0,1,2,3].map(i=><img key={i} className={'mascot-frame mascot-frame-'+i} src={'/assets/sprites/'+animal+'/walk-'+i+'.png'} alt="" draggable={false}/>)}</span>;
}
