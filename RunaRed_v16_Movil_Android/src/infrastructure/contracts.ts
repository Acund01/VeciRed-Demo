import type {Post,UserProfile,Neighbor} from '../models/types';
/** Backend integration boundary. Supabase implementation should satisfy these contracts. */
export interface AuthGateway { signIn(email:string,password:string):Promise<UserProfile>; signUp(email:string,password:string,name:string):Promise<UserProfile>; signOut():Promise<void>; currentUser():Promise<UserProfile|null>; }
export interface NeighborhoodGateway { listNeighbors(sector:string):Promise<Neighbor[]>; listPosts(sector:string):Promise<Post[]>; createPost(input:Omit<Post,'id'|'createdAt'>):Promise<Post>; closePost(id:string):Promise<void>; }
export interface ProfileGateway { updatePreferences(id:string,preferences:Pick<UserProfile,'animal'|'habitat'|'hobby'|'phone'>):Promise<UserProfile>; }
