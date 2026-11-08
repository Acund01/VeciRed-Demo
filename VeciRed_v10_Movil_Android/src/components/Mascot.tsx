import type { Animal } from '../models/types';
const animals:Record<Animal,string>={castor:'🦫',cuy:'🐹',vizcacha:'🐰',alpaca:'🦙'};
export function Mascot({animal='castor',size='normal'}:{animal?:Animal;size?:'normal'|'large'|'small'}){return <span className={'mascot mascot-'+size} role="img" aria-label={animal}>{animals[animal]}</span>}
