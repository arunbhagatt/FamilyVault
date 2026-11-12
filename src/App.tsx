import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode, TouchEvent } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import * as pdfjsLib from 'pdfjs-dist';
import { TextLayerBuilder } from 'pdfjs-dist/web/pdf_viewer.mjs';
import 'pdfjs-dist/web/pdf_viewer.css';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Home, Users, GitBranch, FileText, Settings, Plus, Search, Trash2, Pencil, Pin, PinOff, Grid2X2, List, Upload, Download, X, Share2, ChevronRight, ZoomIn, ZoomOut, ArrowLeft } from 'lucide-react';
import JSZip from 'jszip';
import { people, links, docs, savePerson, saveLink, saveDoc, deletePerson, deleteDoc, deleteLink, importRecords, type Person, type Link, type Doc } from './data/db';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
const BackupFolder = registerPlugin<any>('FamilyVaultBackup');
const sharedFileCache = new Map<string, string>();
type Page = 'home' | 'family' | 'tree' | 'documents' | 'settings';
type Profile = { id: string; name: string; pins: string[]; mv: 'grid' | 'list'; dv: 'grid' | 'list' };
const pages: Page[] = ['home', 'family', 'tree', 'documents', 'settings'];
const pageTitles: Record<Page, string> = { home: 'Home', family: 'Family members', tree: 'Family tree', documents: 'Documents', settings: 'Settings' };
const cats = ['Aadhaar', 'PAN', 'Voter ID', 'Driving licence', 'Passport', 'Land / property', 'Bank', 'Education', 'Medical', 'Other'];
const rels = ['Daughter', 'Son', 'Father', 'Mother', 'Brother', 'Sister', 'Friend', 'Husband', 'Wife'];
const initialProfiles: Profile[] = [{ id: 'arun', name: 'Arun', pins: [], mv: 'grid', dv: 'grid' }, { id: 'father', name: 'Father', pins: [], mv: 'grid', dv: 'list' }, { id: 'brother', name: 'Brother', pins: [], mv: 'grid', dv: 'grid' }];

function App() {
  const [page, setPageState] = useState<Page>('home');
  const pageRef = useRef<Page>('home');
  const historyRef = useRef<Page[]>([]);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const [ms, setMs] = useState<Person[]>([]), [ls, setLs] = useState<Link[]>([]), [ds, setDs] = useState<Doc[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>(() => JSON.parse(localStorage.getItem('fvprofiles') || 'null') || initialProfiles);
  const [active, setActive] = useState('arun'), [q, setQ] = useState(''), [modal, setModal] = useState('');
  const [edit, setEdit] = useState<Person | null>(null), [docEdit, setDocEdit] = useState<Doc | null>(null), [selected, setSelected] = useState<Person | null>(null), [viewer, setViewer] = useState<Doc | null>(null);
  const [msg, setMsg] = useState(''), [restore, setRestore] = useState<any>(null), [restoreMode, setRestoreMode] = useState<'add' | 'update'>('add');
  const profile = profiles.find(p => p.id === active) || profiles[0];
  const setPage = useCallback((next: Page, remember = true) => {
    if (next === pageRef.current) return;
    if (remember) historyRef.current.push(pageRef.current);
    pageRef.current = next; setPageState(next); setQ('');
  }, []);
  const goBack = useCallback(() => {
    if (viewer) { setViewer(null); return; }
    if (modal) { setModal(''); return; }
    if (selected) { setSelected(null); return; }
    const previous = historyRef.current.pop();
    if (previous) { pageRef.current = previous; setPageState(previous); setQ(''); }
    else if (pageRef.current !== 'home') { pageRef.current = 'home'; setPageState('home'); setQ(''); }
  }, [viewer, modal, selected]);
  useEffect(() => {
    const listener = CapApp.addListener('backButton', () => goBack());
    return () => { void listener.then(h => h.remove()); };
  }, [goBack]);
  useEffect(() => { void refresh(); }, []);
  useEffect(() => { localStorage.setItem('fvprofiles', JSON.stringify(profiles)); }, [profiles]);
  const refresh = async () => { const [a, b, c] = await Promise.all([people(), links(), docs()]); setMs(a.sort((x, y) => x.name.localeCompare(y.name))); setLs(b); setDs(c); };
  const say = (s: string) => { setMsg(s); window.setTimeout(() => setMsg(''), 3500); };
  const filteredM = useMemo(() => ms.filter(x => (x.name + ' ' + x.label + ' ' + x.notes).toLowerCase().includes(q.toLowerCase())), [ms, q]);
  const filteredD = useMemo(() => ds.filter(x => (x.name + ' ' + x.category + ' ' + x.fileName).toLowerCase().includes(q.toLowerCase())), [ds, q]);
  const saveM = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget), now = new Date().toISOString();
    const id = edit?.id || crypto.randomUUID();
    const relationship = String(f.get('relationship') || '');
    const relatedTo = String(f.get('relatedTo') || '');
    await savePerson({ id, name: String(f.get('name')).trim(), label: relationship || edit?.label || '', dob: edit?.dob || '', notes: String(f.get('notes') || ''), created: edit?.created || now });
    if (!edit && relationship && relatedTo && relatedTo !== id) {
      await saveLink({ id: crypto.randomUUID(), a: id, b: relatedTo, type: relationship });
    }
    setModal(''); setEdit(null); await refresh(); say('Family member saved.');
  };
  const addRel = async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget), a = String(f.get('a')), b = String(f.get('b')), type = String(f.get('type')); if (a === b) { say('Choose two different people.'); return; } if (ls.some(x => x.a === a && x.b === b && x.type === type)) { say('This relationship already exists.'); return; } await saveLink({ id: crypto.randomUUID(), a, b, type }); setModal(''); await refresh(); say('Relationship saved.'); };
  const addDoc = async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget), file = f.get('file') as File; if (!file) return; const ext = file.name.split('.').pop()?.toLowerCase(); if (!['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) { say('Only PDF, JPG, PNG and WebP are supported.'); return; } await saveDoc({ id: crypto.randomUUID(), personId: String(f.get('person')), name: String(f.get('name')).trim(), category: String(f.get('category')), fileName: file.name, mime: file.type || (ext === 'pdf' ? 'application/pdf' : 'image/' + ext), size: file.size, blob: new Blob([await file.arrayBuffer()], { type: file.type }), created: new Date().toISOString() }); setModal(''); await refresh(); say('Document stored locally.'); };
  const updateDoc = async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); if (!docEdit) return; const f = new FormData(e.currentTarget); await saveDoc({ ...docEdit, personId: String(f.get('person')), name: String(f.get('name')).trim(), category: String(f.get('category')) }); setDocEdit(null); await refresh(); say('Document details updated.'); };
  const chooseBackupFolder = async () => {
    try {
      if (!Capacitor.isNativePlatform()) { say('Folder selection is available in the Android app.'); return; }
      await BackupFolder.pickFolder();
      say('Backup folder selected. Android will remember this folder.');
    } catch (e) { say(e instanceof Error ? e.message : 'Folder selection was cancelled.'); }
  };
  const createBackup = async () => {
    try {
      const z = new JSZip(), entries: any[] = [];
      for (const d of ds) {
        const safeName = d.fileName.replace(/[<>:"/\\|?*]/g, '_');
        const path = `files/${d.id}/${safeName}`;
        z.file(path, d.blob);
        entries.push({ id:d.id, personId:d.personId, name:d.name, category:d.category, fileName:d.fileName, mime:d.mime, size:d.size, created:d.created, path });
      }
      z.file('manifest.json', JSON.stringify({ format:'FAMILYVAULT', version:1, created:new Date().toISOString(), entries }));
      z.file('people.json', JSON.stringify(ms));
      z.file('links.json', JSON.stringify(ls));
      say('Preparing backup…');
      const bytes: Uint8Array = await z.generateAsync({ type:'uint8array', compression:'DEFLATE', compressionOptions:{ level:3 } });
      const filename = `FamilyVault_Backup_${new Date().toISOString().slice(0,10)}.fvault`;
      if (Capacitor.isNativePlatform()) {
        const folder = await BackupFolder.hasFolder();
        if (!folder?.selected) { await chooseBackupFolder(); say('Folder selected. Tap Create Backup again to save your backup.'); return; }
        await BackupFolder.startBackup({ fileName:filename });
        const chunkSize = 96 * 1024;
        for (let offset=0; offset<bytes.length; offset+=chunkSize) {
          const chunk=bytes.subarray(offset,Math.min(offset+chunkSize,bytes.length));
          let binary=''; for(let i=0;i<chunk.length;i++) binary+=String.fromCharCode(chunk[i]);
          await BackupFolder.appendBackupChunk({ base64:btoa(binary) });
          if (offset % (chunkSize*8) === 0) say(`Writing backup… ${Math.round(offset/bytes.length*100)}%`);
        }
        await BackupFolder.finishBackup();
        say(`Backup created: ${filename}`);
      } else {
        download(new Blob([bytes],{type:'application/octet-stream'}),filename);
        say('Backup downloaded.');
      }
    } catch (e) {
      try { if (Capacitor.isNativePlatform()) await BackupFolder.finishBackup(); } catch {}
      say(e instanceof Error ? `Backup failed: ${e.message}` : 'Backup failed.');
    }
  };
  const readRestore = async (file: File) => { try { const z = await JSZip.loadAsync(file, { checkCRC32: true }), mf = z.file('manifest.json'), pf = z.file('people.json'), lf = z.file('links.json'); if (!mf || !pf || !lf) throw Error('Not a valid FamilyVault backup.'); const man = JSON.parse(await mf.async('string')); if (man.format !== 'FAMILYVAULT' || man.version !== 1) throw Error('Unsupported backup version.'); const pm = JSON.parse(await pf.async('string')) as Person[], pl = JSON.parse(await lf.async('string')) as Link[], pd: Doc[] = []; for (const x of man.entries) { const ent = z.file(x.path); if (!ent) throw Error('Missing backup file: ' + x.fileName); const blob = await ent.async('blob'); if (blob.size !== x.size) throw Error('File size check failed: ' + x.fileName); pd.push({ ...x, blob }); } setRestore({ pm, pl, pd, created: man.created }); } catch (e) { say(e instanceof Error ? e.message : 'Backup could not be read.'); } };
  const doRestore = async () => { if (!restore) return; const r = await importRecords(restore.pm, restore.pl, restore.pd, restoreMode); setRestore(null); await refresh(); say(`Restore complete: ${r.addedM} new people, ${r.addedL} relationships, ${r.addedD} new documents, ${r.updatedD} updated documents.`); };
  const startTouch = (e: TouchEvent<HTMLElement>) => { const t = e.touches[0]; touchRef.current = { x: t.clientX, y: t.clientY }; };
  const endTouch = (e: TouchEvent<HTMLElement>) => { if (!touchRef.current || modal || viewer || selected) return; const dx = e.changedTouches[0].clientX - touchRef.current.x, dy = e.changedTouches[0].clientY - touchRef.current.y; touchRef.current = null; const target = e.target as HTMLElement; if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.2 || target.closest('input,textarea,select,button,.tree-scroll,.tree-canvas,.doc-viewer')) return; const idx = pages.indexOf(pageRef.current), next = pages[idx + (dx < 0 ? 1 : -1)]; if (next) setPage(next); };
  const togglePin = (id: string) => setProfiles(ps => ps.map(p => p.id === active ? { ...p, pins: p.pins.includes(id) ? p.pins.filter(x => x !== id) : [...p.pins, id] } : p));
  const openPerson = (m: Person) => setSelected(m);
  return <div className="app">
    <header><button className="brand" onClick={() => setPage('home')}><b>F</b> FamilyVault</button><label className="profile">VIEW AS <select value={active} onChange={e => setActive(e.target.value)}>{profiles.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label><span className="offline">● OFFLINE & LOCAL</span></header>
    <div className="layout"><nav className="bottom-nav" aria-label="Main navigation">{pages.map(id => { const I = id === 'home' ? Home : id === 'family' ? Users : id === 'tree' ? GitBranch : id === 'documents' ? FileText : Settings; return <button className={page === id ? 'active' : ''} key={id} title={pageTitles[id]} aria-label={pageTitles[id]} aria-current={page === id ? 'page' : undefined} onClick={() => setPage(id)}><I size={22} strokeWidth={page === id ? 2.5 : 1.8}/></button>; })}</nav>
      <main key={page} className="page-transition" onTouchStart={startTouch} onTouchEnd={endTouch}>
        <div className="heading"><div><small>FAMILYVAULT / {page.toUpperCase()}</small><h1>{pageTitles[page]}</h1></div>{(page === 'home' || page === 'family') && <button className="primary" onClick={() => { setEdit(null); setModal('person'); }}><Plus size={16}/> Add member</button>}{page === 'documents' && <button className="primary" onClick={() => setModal('doc')}><Upload size={16}/> Add document</button>}</div>
        {msg && <p className="message">{msg}</p>}
        {page === 'home' && <><section className="hero"><small>A PLACE FOR WHAT MATTERS</small><h2>Your family's<br/><em>important things.</em></h2><p>Keep family details and important documents organised in one simple place, right on this device.</p><button className="primary" onClick={() => { setEdit(null); setModal('person'); }}><Plus size={16}/> Add a family member</button></section><h2 className="section-title">Pinned family members</h2><div className="cards">{ms.filter(m => profile.pins.includes(m.id)).map(m => <button className="person pinned-person" key={m.id} onClick={() => openPerson(m)}><b>{m.name}</b><small>{m.label}</small></button>)}</div><div className="shortcuts"><button onClick={() => setPage('tree')}><GitBranch/> Family tree</button><button onClick={() => setPage('family')}><Users/> Family list</button><button onClick={() => setPage('documents')}><FileText/> Documents</button></div></>}
        {page === 'family' && <><div className="tools"><div className="search"><Search size={16}/><input placeholder="Search family..." value={q} onChange={e => setQ(e.target.value)}/></div><button onClick={() => setModal('relationship')}>Add relationship</button><button aria-label="Toggle grid or list" onClick={() => setProfiles(ps => ps.map(p => p.id === active ? { ...p, mv: p.mv === 'grid' ? 'list' : 'grid' } : p))}>{profile.mv === 'grid' ? <List/> : <Grid2X2/>}</button></div><div className={profile.mv === 'grid' ? 'cards' : 'rows'}>{filteredM.map(m => <article className="person" key={m.id}><button className="person-main" onClick={() => openPerson(m)}><b>{m.name}</b><small>{m.label || 'Family member'}</small></button><button title="Pin/unpin" onClick={() => togglePin(m.id)}>{profile.pins.includes(m.id) ? <PinOff/> : <Pin/>}</button><button aria-label="Edit member" onClick={() => { setEdit(m); setModal('person'); }}><Pencil/></button><button aria-label="Delete member" onClick={async () => { if (confirm(`Delete ${m.name} and their linked documents?`)) { await deletePerson(m.id); await refresh(); } }}><Trash2/></button></article>)}</div></>}
        {page === 'tree' && <><div className="tools"><p>Tap any person to open their profile and documents.</p><button onClick={() => setModal('relationship')}><Plus size={16}/> Add relationship</button></div><FamilyTree members={ms} relations={ls} onSelect={openPerson}/></>}
        {page === 'documents' && <><div className="tools"><div className="search"><Search size={16}/><input placeholder="Search documents..." value={q} onChange={e => setQ(e.target.value)}/></div><button onClick={() => setProfiles(ps => ps.map(p => p.id === active ? { ...p, dv: p.dv === 'grid' ? 'list' : 'grid' } : p))}>{profile.dv === 'grid' ? <List/> : <Grid2X2/>}</button></div><div className={profile.dv === 'grid' ? 'doc-grid' : 'doc-list'}>{filteredD.map(d => <article className="doc" key={d.id}><button className="doc-open" onClick={() => setViewer(d)}><span className="doc-icon">{d.mime === 'application/pdf' || d.fileName.toLowerCase().endsWith('.pdf') ? 'PDF' : 'IMG'}</span><span><b>{d.name}</b><small>{ms.find(m => m.id === d.personId)?.name || 'Unknown'} · {d.category}</small></span></button><button aria-label="Edit document details" onClick={() => setDocEdit(d)}><Pencil/></button><button aria-label="Delete document" onClick={async () => { if (confirm(`Delete ${d.name}?`)) { await deleteDoc(d.id); await refresh(); } }}><Trash2/></button></article>)}</div></>}
        {page === 'settings' && <><section className="setting"><h2>Backup and restore</h2><p>Create a portable .fvault backup of family members, relationships and original documents. Your local viewing profiles and pins are not included.</p><div className="setting-actions"><button className="secondary" onClick={() => void chooseBackupFolder()}>Choose backup folder</button><button className="primary" onClick={() => void createBackup()}><Download size={16}/> Create backup</button><label className="file-button"><Upload size={16}/> Load new data<input type="file" accept=".fvault,.zip" onChange={e => { const f = e.target.files?.[0]; if (f) void readRestore(f); e.currentTarget.value = ''; }}/></label></div><p className="muted">Choose a folder once. Android remembers your selection for future backups.</p></section><section className="setting"><h2>Local viewing profiles</h2><p>Profiles are display preferences, not security or passwords.</p>{profiles.map(p => <p key={p.id}>{p.name} {p.id === active ? '(active)' : ''} {p.id !== 'arun' && <button onClick={() => setProfiles(ps => ps.filter(x => x.id !== p.id))}>Remove</button>}</p>)}<form onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget), name = String(f.get('profile')).trim(); if (name) setProfiles(ps => [...ps, { id: crypto.randomUUID(), name, pins: [], mv: 'grid', dv: 'grid' }]); e.currentTarget.reset(); }}><input name="profile" placeholder="New profile name" required/><button>Add profile</button></form></section><p className="muted">No account, cloud sync, ads or analytics. Keep backups separately. Uninstalling may remove local app data.</p></>}
      </main>
    </div>
    {modal === 'person' && <Modal title={edit ? 'Edit family member' : 'Add family member'} close={() => setModal('')}><form onSubmit={saveM}><label>Full name<input name="name" defaultValue={edit?.name || ''} required/></label>{!edit && <><label>Relationship<select name="relationship" required={ms.length > 0}><option value="">No relationship / first member</option>{rels.map(r => <option key={r}>{r}</option>)}</select></label><label>Related to<select name="relatedTo" required={ms.length > 0}><option value="">Select a person</option>{ms.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label></>}<label>Notes<textarea name="notes" defaultValue={edit?.notes || ''}/></label><Actions close={() => setModal('')}/></form></Modal>}
    {modal === 'relationship' && <Modal title="Add relationship" close={() => setModal('')}><form onSubmit={addRel}><label>Person A<select name="a">{ms.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label>Person B<select name="b">{ms.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label>Relationship of Person A to Person B<select name="type">{rels.map(r => <option key={r}>{r}</option>)}</select></label><p className="muted">The selected relationship describes Person A in relation to Person B.</p><Actions close={() => setModal('')}/></form></Modal>}
    {docEdit && <Modal title="Edit document details" close={() => setDocEdit(null)}><form onSubmit={updateDoc}><label>Belongs to<select name="person" defaultValue={docEdit.personId}>{ms.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label>Document name<input name="name" defaultValue={docEdit.name} required/></label><label>Category<select name="category" defaultValue={docEdit.category}>{cats.map(c => <option key={c}>{c}</option>)}</select></label><p className="muted">The original file remains unchanged.</p><Actions close={() => setDocEdit(null)}/></form></Modal>}
    {modal === 'doc' && <Modal title="Add family document" close={() => setModal('')}><form onSubmit={addDoc}><label>Belongs to<select name="person">{ms.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label>Document name<input name="name" required placeholder="e.g. Aadhaar card"/></label><label>Category<select name="category">{cats.map(c => <option key={c}>{c}</option>)}</select></label><label>File (PDF, JPG, PNG, WebP)<input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" required/></label><Actions close={() => setModal('')}/></form></Modal>}
    {restore && <Modal title="Review backup" close={() => setRestore(null)}><p>Backup date: {new Date(restore.created).toLocaleString()}</p><p>{restore.pm.length} people · {restore.pl.length} relationships · {restore.pd.length} documents</p><label className="restore-label">Restore mode<select value={restoreMode} onChange={e => setRestoreMode(e.target.value as 'add' | 'update')}><option value="add">Add New Files Only</option><option value="update">Update and Add New Files</option></select></label><p>Existing records are not deleted. Add mode leaves existing document records untouched. Update mode replaces matching document IDs.</p><button className="primary" onClick={() => void doRestore()}>Confirm restore</button></Modal>}
    {selected && <PersonDetail person={selected} members={ms} relations={ls} documents={ds.filter(d => d.personId === selected.id)} close={() => setSelected(null)} onOpenDoc={d => { setSelected(null); setViewer(d); }} onRemoveRelation={async id => { await deleteLink(id); await refresh(); }} />}
    {viewer && <Viewer doc={viewer} close={() => setViewer(null)} say={say}/>}
  </div>;
}

function FamilyTree({ members, relations, onSelect }: { members: Person[]; relations: Link[]; onSelect: (m: Person) => void }) {
  if (!members.length) return <div className="tree-empty">Add family members and connect them to build your family tree.</div>;
  const [treeScale, setTreeScale] = useState(1);
  const treePointers = useRef(new Map<number, {x:number;y:number}>());
  const pinchDistance = (a: {x:number;y:number}, b: {x:number;y:number}) => Math.hypot(a.x-b.x, a.y-b.y);
  const lastPinch = useRef<number | null>(null);
  const lastPan = useRef<{x:number;y:number} | null>(null);
  const parentEdges = relations.flatMap(r => {
    if (r.type === 'Father' || r.type === 'Mother' || r.type === 'Parent') return [{ parent: r.a, child: r.b }];
    if (r.type === 'Daughter' || r.type === 'Son' || r.type === 'Child') return [{ parent: r.b, child: r.a }];
    if (r.type === 'Grandparent') return [{ parent: r.a, child: r.b }];
    return [];
  }).filter(e => members.some(m => m.id === e.parent) && members.some(m => m.id === e.child));
  const parentMap = new Map<string, string[]>();
  parentEdges.forEach(e => parentMap.set(e.child, [...(parentMap.get(e.child) || []), e.parent]));
  const childrenMap = new Map<string, string[]>();
  parentEdges.forEach(e => childrenMap.set(e.parent, [...(childrenMap.get(e.parent) || []), e.child]));
  const roots = members.filter(m => !(parentMap.get(m.id) || []).length);
  const levels = new Map<string, number>();
  const assign = (id: string, level: number, path = new Set<string>()) => {
    if (path.has(id)) return;
    const old = levels.get(id);
    if (old !== undefined && old >= level) return;
    levels.set(id, level);
    const nextPath = new Set(path); nextPath.add(id);
    (childrenMap.get(id) || []).forEach(child => assign(child, level + 1, nextPath));
  };
  (roots.length ? roots : members.slice(0, 1)).forEach(m => assign(m.id, 0));
  members.forEach(m => { if (!levels.has(m.id)) levels.set(m.id, 0); });
  // Keep peer relationships on the same generation where possible.
  let changed = true, guard = 0;
  while (changed && guard++ < members.length) {
    changed = false;
    relations.filter(r => ['Brother','Sister','Friend','Husband','Wife','Sibling','Spouse'].includes(r.type)).forEach(r => {
      const a = levels.get(r.a), b = levels.get(r.b);
      if (a === undefined || b === undefined) return;
      const level = Math.max(a, b);
      if (a !== level) { levels.set(r.a, level); changed = true; }
      if (b !== level) { levels.set(r.b, level); changed = true; }
    });
  }
  const maxLevel = Math.max(0, ...levels.values());
  const rows = Array.from({ length: maxLevel + 1 }, (_, level) => members.filter(m => levels.get(m.id) === level));
  const nodeW = 190, nodeH = 88, colGap = 38, rowGap = 150, pad = 30;
  const width = Math.max(640, ...rows.map(row => row.length * (nodeW + colGap) + pad * 2 - colGap));
  const height = pad * 2 + rows.length * rowGap;
  const positions = new Map<string, { x: number; y: number }>();
  rows.forEach((row, ri) => {
    const total = row.length * (nodeW + colGap) - colGap;
    const left = Math.max(pad, (width - total) / 2);
    row.forEach((m, i) => positions.set(m.id, { x: left + i * (nodeW + colGap), y: pad + ri * rowGap }));
  });
  const peerRelations = relations.filter(r => ['Brother','Sister','Friend','Husband','Wife','Sibling','Spouse'].includes(r.type));
  return <div className="tree-scroll" onPointerDown={e => { if (e.pointerType !== 'touch') return; treePointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY}); if(treePointers.current.size===2){const pts=[...treePointers.current.values()];lastPinch.current=pinchDistance(pts[0],pts[1]);lastPan.current=null;}else{lastPan.current={x:e.clientX,y:e.clientY};} }} onPointerMove={e => { if(e.pointerType!=='touch'||!treePointers.current.has(e.pointerId))return; const prev=treePointers.current.get(e.pointerId)!; treePointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY}); if(treePointers.current.size>=2){const pts=[...treePointers.current.values()];const d=pinchDistance(pts[0],pts[1]);if(lastPinch.current&&d>0){const ratio=d/lastPinch.current; if(Math.abs(ratio-1)>.003)setTreeScale(v=>Math.max(.4,Math.min(2.6,v*ratio)));}lastPinch.current=d;}else if(lastPan.current){const dx=e.clientX-prev.x,dy=e.clientY-prev.y;e.currentTarget.scrollLeft-=dx;e.currentTarget.scrollTop-=dy;lastPan.current={x:e.clientX,y:e.clientY};} }} onPointerUp={e=>{treePointers.current.delete(e.pointerId);if(treePointers.current.size<2)lastPinch.current=null;if(treePointers.current.size===1){lastPan.current=[...treePointers.current.values()][0];}else lastPan.current=null;}} onPointerCancel={e=>{treePointers.current.delete(e.pointerId);lastPinch.current=null;lastPan.current=null;}}><div className="tree-zoom-controls"><button onClick={() => setTreeScale(v => Math.max(.45, +(v-.1).toFixed(2)))}>−</button><span>{Math.round(treeScale*100)}%</span><button onClick={() => setTreeScale(v => Math.min(2.2, +(v+.1).toFixed(2)))}>+</button><button onClick={() => setTreeScale(1)}>Reset</button></div><div style={{ width: width*treeScale, height: height*treeScale, position:'relative' }}><div className="tree-canvas" style={{ width, height, transform:`scale(${treeScale})`, transformOrigin:'top left' }}>
    <svg className="tree-lines" width={width} height={height}>
      {parentEdges.map((e, i) => { const a = positions.get(e.parent), b = positions.get(e.child); if (!a || !b) return null; const x1 = a.x + nodeW / 2, y1 = a.y + nodeH, x2 = b.x + nodeW / 2, y2 = b.y; const mid = y1 + Math.max(22, (y2-y1)/2); return <path key={`p${i}`} d={`M ${x1} ${y1} V ${mid} H ${x2} V ${y2}`} />; })}
      {peerRelations.map((r, i) => { const a = positions.get(r.a), b = positions.get(r.b); if (!a || !b || a.y !== b.y) return null; return <path className="tree-peer-line" key={`peer${i}`} d={`M ${a.x + nodeW/2} ${a.y + nodeH/2} H ${b.x + nodeW/2}`} />; })}
    </svg>
    {members.map(m => { const p = positions.get(m.id)!; const connected = relations.filter(r => r.a === m.id || r.b === m.id).map(r => { const otherId = r.a === m.id ? r.b : r.a; const other = members.find(x => x.id === otherId); return other ? `${r.a === m.id ? r.type : inverseRelation(r.type)} of ${other.name}` : ''; }).filter(Boolean); return <button key={m.id} className="tree-node" style={{ left:p.x, top:p.y, width:nodeW, height:nodeH }} onClick={() => onSelect(m)}><b>{m.name}</b><small>{m.label || 'Family member'}</small>{connected[0] && <em>{connected[0]}</em>}</button>; })}
  </div></div></div>;
}
function inverseRelation(r: string) {
  const map: Record<string,string> = { Daughter:'Parent', Son:'Parent', Father:'Child', Mother:'Child', Brother:'Sibling', Sister:'Sibling', Husband:'Wife', Wife:'Husband', Parent:'Child', Child:'Parent', Grandparent:'Grandchild', Spouse:'Spouse', Sibling:'Sibling' };
  return map[r] || r;
}
function PersonDetail({ person, members, relations, documents, close, onOpenDoc, onRemoveRelation }: { person: Person; members: Person[]; relations: Link[]; documents: Doc[]; close: () => void; onOpenDoc: (d: Doc) => void; onRemoveRelation: (id: string) => void }) {
  const connected = relations.filter(r => r.a === person.id || r.b === person.id);
  return <div className="shade" onClick={e => { if (e.target === e.currentTarget) close(); }}><section className="modal person-detail"><div className="modalhead"><h2>{person.name}</h2><button onClick={close}><X/></button></div><p className="person-subtitle">{person.label || 'Family member'}</p>{person.notes && <p>{person.notes}</p>}<h3>Connected family members</h3>{connected.length ? connected.map(r => { const other = members.find(m => m.id === (r.a === person.id ? r.b : r.a)); return other ? <div className="related-person" key={r.id}><span><b>{other.name}</b><small>{r.a === person.id ? r.type : inverseRelation(r.type)}</small></span><button onClick={() => onRemoveRelation(r.id)}>Remove</button></div> : null; }) : <p className="muted">No relationships added yet.</p>}<h3>Documents ({documents.length})</h3>{documents.length ? documents.map(d => <button className="detail-doc" key={d.id} onClick={() => onOpenDoc(d)}><FileText size={17}/><span><b>{d.name}</b><small>{d.category} · {d.fileName}</small></span><ChevronRight size={16}/></button>) : <p className="muted">No documents added for this person.</p>}</section></div>;
}
function Viewer({ doc, close, say }: { doc: Doc; close: () => void; say: (s: string) => void }) {
  const [numPages, setNumPages] = useState(1), [scale, setScale] = useState(Math.min(1.2, (window.innerWidth - 32) / 612)), [pdfError, setPdfError] = useState(''), [imageUrl, setImageUrl] = useState('');
  const [search, setSearch] = useState(''), [matches, setMatches] = useState<number[]>([]), [matchIndex, setMatchIndex] = useState(0), [pageInput, setPageInput] = useState('1');
  const containerRef = useRef<HTMLDivElement>(null), pdfRef = useRef<any>(null), touchDistance = useRef<number | null>(null);
  const isPdf = doc.mime.includes('pdf') || doc.fileName.toLowerCase().endsWith('.pdf');
  useEffect(() => { const u = URL.createObjectURL(doc.blob); setImageUrl(u); return () => URL.revokeObjectURL(u); }, [doc]);
  useEffect(() => {
    if (!isPdf) return;
    let cancelled = false;
    let observer: IntersectionObserver | null = null;
    (async () => {
      try {
        const pdf = await pdfjsLib.getDocument({ data: await doc.blob.arrayBuffer() }).promise;
        if (cancelled) { await pdf.destroy(); return; }
        pdfRef.current = pdf; setNumPages(pdf.numPages); setPageInput('1');
        const root = containerRef.current;
        if (!root) return;
        const visibleBefore = Array.from(root.querySelectorAll<HTMLElement>('.pdf-sheet')).find(el => el.offsetTop + el.offsetHeight > root.scrollTop);
        const keepPage = Number(visibleBefore?.dataset.page || 1);
        root.innerHTML = '';
        const pending = new WeakSet<Element>();
        const renderSheet = async (sheet: HTMLElement) => {
          if (cancelled || sheet.dataset.rendered === '1' || pending.has(sheet)) return;
          pending.add(sheet);
          try {
            const n = Number(sheet.dataset.page), page = await pdf.getPage(n);
            if (cancelled) return;
            const viewport = page.getViewport({ scale });
            sheet.style.width=`${viewport.width}px`; sheet.style.height=`${viewport.height}px`;
            const ratio = Math.min(window.devicePixelRatio || 1, 1.6);
            const canvas = document.createElement('canvas'); canvas.className='pdf-canvas';
            const ctx = canvas.getContext('2d'); if (!ctx) return;
            canvas.width = Math.floor(viewport.width*ratio); canvas.height = Math.floor(viewport.height*ratio);
            canvas.style.width = `${viewport.width}px`; canvas.style.height = `${viewport.height}px`;
            sheet.style.width = `${viewport.width}px`; sheet.style.height = `${viewport.height}px`;
            sheet.appendChild(canvas);
            await page.render({ canvasContext: ctx, viewport, transform: ratio===1 ? undefined : [ratio,0,0,ratio,0,0] }).promise;
            if (cancelled) return;
            const textLayer = new TextLayerBuilder({ pdfPage:page });
            sheet.appendChild(textLayer.div); await textLayer.render(viewport);
            sheet.dataset.rendered = '1';
          } finally { pending.delete(sheet); }
        };
        const firstPage = await pdf.getPage(1);
        const firstViewport = firstPage.getViewport({ scale });
        const estimatedRatio = firstViewport.height / Math.max(1, firstViewport.width);
        for (let n=1; n<=pdf.numPages; n++) {
          if (cancelled) break;
          const sheet = document.createElement('div'); sheet.className='pdf-sheet'; sheet.dataset.page=String(n);
          sheet.style.width=`${firstViewport.width}px`; sheet.style.height=`${firstViewport.width*estimatedRatio}px`;
          sheet.setAttribute('aria-label', `Page ${n}`); root.appendChild(sheet);
        }
        observer = new IntersectionObserver(entries => {
          const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio-a.intersectionRatio)[0];
          if (visible) setPageInput((visible.target as HTMLElement).dataset.page || '1');
          entries.forEach(entry => { if (entry.isIntersecting) void renderSheet(entry.target as HTMLElement); });
        }, { root, rootMargin:'900px 0px', threshold:[0.05,0.25,0.5,0.75] });
        root.querySelectorAll('.pdf-sheet').forEach(sheet => observer!.observe(sheet));
        const restore = root.querySelector(`[data-page="${Math.min(keepPage,pdf.numPages)}"]`) as HTMLElement | null;
        if (restore) root.scrollTop = restore.offsetTop;
        const first = root.querySelector('.pdf-sheet') as HTMLElement | null;
        const initial = restore || first;
        if (initial) await renderSheet(initial);
      } catch(e) { if (!cancelled) setPdfError(e instanceof Error ? e.message : 'Unable to open this PDF.'); }
    })();
    return () => { cancelled=true; observer?.disconnect(); pdfRef.current?.destroy?.(); pdfRef.current=null; };
  }, [doc, isPdf, scale]);
  const goToPage = (n:number) => {
    const page = Math.max(1,Math.min(numPages,Math.floor(n)||1)); setPageInput(String(page));
    containerRef.current?.querySelector(`[data-page="${page}"]`)?.scrollIntoView({behavior:'smooth',block:'start'});
  };
  const runSearch = async () => {
    const pdf=pdfRef.current, term=search.trim().toLowerCase(); if(!pdf||!term)return;
    const found:number[]=[];
    for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n);const content=await page.getTextContent();const text=(content.items as any[]).map(x=>x.str||'').join(' ').toLowerCase();if(text.includes(term))found.push(n);}
    setMatches(found);setMatchIndex(0);
    containerRef.current?.querySelectorAll('.textLayer span').forEach((span:any)=>{span.style.backgroundColor='';});
    if(found.length){
      const spans=Array.from(containerRef.current?.querySelectorAll('.textLayer span')||[]) as HTMLElement[];
      spans.forEach(span=>{if((span.textContent||'').toLowerCase().includes(term))span.style.backgroundColor='#ffe66d';});
      goToPage(found[0]);
    } else say('No matching text found in this PDF.');
  };
  const share = async () => { try { const name=doc.fileName.replace(/[\\/:*?"<>|]/g,'_'); if(Capacitor.isNativePlatform()){let uri=sharedFileCache.get(doc.id);if(!uri){const data=await blobToBase64(doc.blob);const path=`share/${doc.id}-${name}`;await Filesystem.writeFile({path,data,directory:Directory.Cache,recursive:true});uri=(await Filesystem.getUri({path,directory:Directory.Cache})).uri;sharedFileCache.set(doc.id,uri);}await Share.share({title:doc.name,files:[uri],dialogTitle:'Share document'});} else if(navigator.share&&navigator.canShare?.({files:[new File([doc.blob],name,{type:doc.mime})]})){await navigator.share({files:[new File([doc.blob],name,{type:doc.mime})],title:doc.name});}else download(doc.blob,name);}catch(e){say(e instanceof Error?`Share failed: ${e.message}`:'Sharing was cancelled or unavailable.');}};
  const distance=(a:{clientX:number;clientY:number},b:{clientX:number;clientY:number})=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
  return <div className="shade viewer"><section className="viewbox doc-viewer">
    <div className="modalhead"><button onClick={close} aria-label="Back"><ArrowLeft/></button><b>{doc.name}</b><button onClick={()=>void share()} aria-label="Share"><Share2/></button></div>
    {isPdf ? <>
      <div className="pdf-toolbar">
        <input aria-label="Page number" className="pdf-page-input" value={pageInput} onChange={e=>setPageInput(e.target.value)} onBlur={()=>goToPage(Number(pageInput))} onKeyDown={e=>{if(e.key==='Enter')goToPage(Number(pageInput));}}/>
        <span>of {numPages}</span>
        <button onClick={()=>setScale(x=>Math.max(.5,+(x-.15).toFixed(2)))}><ZoomOut/></button><span>{Math.round(scale*100)}%</span><button onClick={()=>setScale(x=>Math.min(2.5,+(x+.15).toFixed(2)))}><ZoomIn/></button>
        <input className="pdf-search" placeholder="Search in PDF" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void runSearch();}}/>
        <button onClick={()=>void runSearch()} aria-label="Search"><Search/></button>
        {matches.length>0&&<><button onClick={()=>{const i=(matchIndex-1+matches.length)%matches.length;setMatchIndex(i);goToPage(matches[i]);}}>‹</button><span>{matchIndex+1}/{matches.length}</span><button onClick={()=>{const i=(matchIndex+1)%matches.length;setMatchIndex(i);goToPage(matches[i]);}}>›</button></>}
      </div>
      {pdfError?<p className="pdf-error">PDF could not be rendered: {pdfError}</p>:<div ref={containerRef} className="pdf-document" onTouchStart={e=>{if(e.touches.length===2)touchDistance.current=distance(e.touches[0],e.touches[1]);}} onTouchMove={e=>{if(e.touches.length===2&&touchDistance.current){const d=distance(e.touches[0],e.touches[1]);if(Math.abs(d-touchDistance.current)>1){const ratio=d/touchDistance.current!;setScale(x=>Math.max(.5,Math.min(2.5,+(x*ratio).toFixed(2))));touchDistance.current=d;}}}} onTouchEnd={()=>{touchDistance.current=null;}}/>}
    </>:<img src={imageUrl} alt={doc.name}/>}
  </section></div>;
}
function Modal({ title, close, children }: { title: string; close: () => void; children: ReactNode }) { return <div className="shade" onClick={e => { if (e.target === e.currentTarget) close(); }}><section className="modal"><div className="modalhead"><h2>{title}</h2><button onClick={close}><X/></button></div>{children}</section></div>; }
function Actions({ close }: { close: () => void }) { return <div className="actions"><button type="button" onClick={close}>Cancel</button><button className="primary">Save</button></div>; }
async function blobToBase64(blob: Blob): Promise<string> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] || ''); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); }); }
function download(blob: Blob, name: string) { const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1500); }
export default App;
