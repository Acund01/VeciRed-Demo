import type {Animal} from '../models/types';
/** Four transparent walk frames from the approved RunaRed animal designs. */
export function Mascot({animal='castor',size='normal'}:{animal?:Animal;size?:'normal'|'large'|'small'}) {
  return <span className={'mascot-animation mascot-'+size} role="img" aria-label={animal}>
    {[0,1,2,3].map(i=><img key={i} className={'mascot-frame mascot-frame-'+i}
      src={'/assets/sprites/'+animal+'/walk-'+i+'.png'} alt="" draggable={false}/>)}
  </span>;
}
