import {useEffect,useMemo,useRef,useState} from 'react';
import {ChevronDown,Hash,Plus,X} from 'lucide-react';

type Props={id:string;label:string;value:string[];options:string[];onChange:(tags:string[])=>void;placeholder?:string;maxTags?:number};

export function MultiTagPicker({id,label,value,options,onChange,placeholder='Elige o escribe etiquetas',maxTags=5}:Props){
 const [query,setQuery]=useState('');
 const [open,setOpen]=useState(false);
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{const close=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false)};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[]);
 const matches=useMemo(()=>options.filter(option=>!value.some(tag=>tag.toLocaleLowerCase()===option.toLocaleLowerCase())&&option.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).slice(0,8),[options,query,value]);
 const canCreate=Boolean(query.trim())&&!value.some(tag=>tag.toLocaleLowerCase()===query.trim().toLocaleLowerCase())&&!options.some(option=>option.toLocaleLowerCase()===query.trim().toLocaleLowerCase());
 const add=(tag:string)=>{const clean=tag.trim().replace(/\s+/g,' ').slice(0,40);if(!clean||value.length>=maxTags||value.some(item=>item.toLocaleLowerCase()===clean.toLocaleLowerCase()))return;onChange([...value,clean]);setQuery('');setOpen(true)};
 const remove=(tag:string)=>onChange(value.filter(item=>item!==tag));
 return <div className="multi-tag-picker" ref={root}>
  <label htmlFor={id}>{label}</label>
  <div className="multi-tag-field"><div className="multi-tag-chips">{value.map(tag=><span className="multi-tag-chip" key={tag}><Hash size={12}/>{tag}<button type="button" aria-label={'Quitar etiqueta '+tag} onClick={()=>remove(tag)}><X size={12}/></button></span>)}<input id={id} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={id+'-options'} value={query} disabled={value.length>=maxTags} autoComplete="off" placeholder={value.length>=maxTags?`Máximo ${maxTags} etiquetas`:placeholder} onFocus={()=>setOpen(true)} onChange={event=>{setQuery(event.target.value);setOpen(true)}} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();const exact=matches.find(option=>option.toLocaleLowerCase()===query.trim().toLocaleLowerCase());if(exact)add(exact);else if(canCreate)add(query)}if(event.key==='Escape')setOpen(false);if(event.key==='Backspace'&&!query&&value.length)remove(value[value.length-1])}}/></div><button type="button" className="multi-tag-chevron" aria-label={open?'Cerrar etiquetas':'Mostrar etiquetas'} onClick={()=>setOpen(current=>!current)}><ChevronDown size={17}/></button></div>
  {open&&value.length<maxTags&&<div className="multi-tag-menu" id={id+'-options'} role="listbox">{matches.map(tag=><button type="button" role="option" aria-selected="false" key={tag} onMouseDown={event=>event.preventDefault()} onClick={()=>add(tag)}><span><Hash size={14}/>{tag}</span></button>)}{canCreate&&<button type="button" className="create-multi-tag" onMouseDown={event=>event.preventDefault()} onClick={()=>add(query)}><Plus size={14}/> Crear etiqueta «{query.trim()}»</button>}{!matches.length&&!canCreate&&<p>No hay más etiquetas coincidentes.</p>}</div>}
  <small>{value.length}/{maxTags} etiquetas · selecciona existentes o crea una nueva.</small>
 </div>;
}
