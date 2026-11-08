import type {Filter,Neighbor,PondResident,Post} from '../models/types';
/** One resident = one animal, regardless of how many active posts they publish. */
export function createResidents(neighbors:Neighbor[],posts:Post[]):PondResident[]{
 const byAuthor=new Map<string,Post[]>();
 for(const post of posts){if(!post.active)continue;const group=byAuthor.get(post.authorId)||[];group.push(post);byAuthor.set(post.authorId,group)}
 return neighbors.map(neighbor=>{const publications=byAuthor.get(neighbor.id)||[];return {neighbor,publications,serviceCount:publications.filter(p=>p.kind==='servicio').length,favorCount:publications.filter(p=>p.kind==='favor').length,emergencyCount:publications.filter(p=>p.kind==='emergencia').length}});
}
export function filterResidents(residents:PondResident[],filter:Filter,emergency:boolean,viewerId?:string){return residents.filter(r=>r.neighbor.id===viewerId||(!emergency&&filter==='todos')||r.publications.some(p=>emergency?p.kind==='emergencia':filter==='todos'||p.kind===filter))}
export function visiblePosts(resident:PondResident,filter:Filter,emergency:boolean){return resident.publications.filter(p=>emergency?p.kind==='emergencia':filter==='todos'||p.kind===filter)}
