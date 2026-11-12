export type Person={id:string;name:string;label:string;dob:string;notes:string;created:string};
export type Link={id:string;a:string;b:string;type:string};
export type Doc={id:string;personId:string;name:string;category:string;fileName:string;mime:string;size:number;blob:Blob;created:string};
const DB='familyvault-local',V=3;
function open():Promise<IDBDatabase>{return new Promise((ok,no)=>{const r=indexedDB.open(DB,V);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('members'))d.createObjectStore('members',{keyPath:'id'});if(!d.objectStoreNames.contains('links'))d.createObjectStore('links',{keyPath:'id'});if(!d.objectStoreNames.contains('docs'))d.createObjectStore('docs',{keyPath:'id'});};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});}
async function all<T>(s:string):Promise<T[]>{const d=await open();return new Promise((ok,no)=>{const r=d.transaction(s).objectStore(s).getAll();r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});}
async function put(s:string,x:unknown){const d=await open();return new Promise<void>((ok,no)=>{const r=d.transaction(s,'readwrite').objectStore(s).put(x);r.onsuccess=()=>ok();r.onerror=()=>no(r.error);});}
async function del(s:string,id:string){const d=await open();return new Promise<void>((ok,no)=>{const r=d.transaction(s,'readwrite').objectStore(s).delete(id);r.onsuccess=()=>ok();r.onerror=()=>no(r.error);});}
export const people=()=>all<Person>('members');export const links=()=>all<Link>('links');export const docs=()=>all<Doc>('docs');
export const savePerson=(x:Person)=>put('members',x);export const saveLink=(x:Link)=>put('links',x);export const saveDoc=(x:Doc)=>put('docs',x);
export const deleteLink=(id:string)=>del('links',id);export const deleteDoc=(id:string)=>del('docs',id);
export async function deletePerson(id:string){const [ls,ds]=await Promise.all([links(),docs()]);const d=await open();const t=d.transaction(['members','links','docs'],'readwrite');t.objectStore('members').delete(id);ls.filter(x=>x.a===id||x.b===id).forEach(x=>t.objectStore('links').delete(x.id));ds.filter(x=>x.personId===id).forEach(x=>t.objectStore('docs').delete(x.id));await new Promise<void>((ok,no)=>{t.oncomplete=()=>ok();t.onerror=()=>no(t.error);});}
export async function importRecords(ms:Person[],ls:Link[],ds:Doc[],mode:'add'|'update'){
 const [oldM,oldL,oldD]=await Promise.all([people(),links(),docs()]);const m=new Map(oldM.map(x=>[x.id,x])),l=new Map(oldL.map(x=>[x.id,x])),d=new Map(oldD.map(x=>[x.id,x]));
 let addedM=0,addedL=0,addedD=0,updatedD=0,skipped=0;
 ms.forEach(x=>{if(!m.has(x.id)){m.set(x.id,x);addedM++;}});
 ls.forEach(x=>{if(!l.has(x.id)&&m.has(x.a)&&m.has(x.b)){l.set(x.id,x);addedL++;}});
 ds.forEach(x=>{if(!m.has(x.personId)){skipped++;return;}if(!d.has(x.id)){d.set(x.id,x);addedD++;}else if(mode==='update'){d.set(x.id,x);updatedD++;}else skipped++;});
 const db=await open();const t=db.transaction(['members','links','docs'],'readwrite');for(const x of m.values())t.objectStore('members').put(x);for(const x of l.values())t.objectStore('links').put(x);for(const x of d.values())t.objectStore('docs').put(x);
 await new Promise<void>((ok,no)=>{t.oncomplete=()=>ok();t.onerror=()=>no(t.error);t.onabort=()=>no(t.error);});return{addedM,addedL,addedD,updatedD,skipped};
}