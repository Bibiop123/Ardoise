import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, get, set, update, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { loadFirebaseConfig } from "./config.js";

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt = new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"});
const money = c => fmt.format((c||0)/100);
const ICON = {
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  arrow:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  share:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>'
};
ICON.chrono = '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 5h4M19 5v3"/><path d="M26.5 8.5l1.6-1.6"/><path d="M12.6 11.2A10 10 0 1 1 13 27"/><path d="M19 18l-3.5-5M19 18l4.5-2.5"/><circle cx="19" cy="18" r="1.2" fill="currentColor"/><path d="M3 14h6M5 18h6M2 22h7M7 26h4"/></svg>';
const plusSm = ICON.plus.replace("<svg",'<svg width="18" height="18"');

/* ---------- utilitaires ---------- */
const LS = {
  get(k,d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch{ return d; } },
  del(k){ try{ localStorage.removeItem(k); }catch{} }
};
const ID_RE = /^[A-Za-z0-9]{20,40}$/;
function randomId(n=22){
  const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", b = new Uint8Array(n);
  crypto.getRandomValues(b); return [...b].map(x => a[x % 62]).join("");
}
async function pinHash(pid, pin){
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`ardoise|${pid}|${pin}`));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,"0")).join("");
}
const PIN_RE = /^\d{4,6}$/;

/* ---------- apparence ---------- */
const SKINS = [
  {id:"ardoise", name:"Ardoise", bg:"#232842", fg:"#ff8a78", theme:"#0f1220", font:"'Bricolage Grotesque',sans-serif", sample:"42 €"},
  {id:"nuit", name:"Nuit", bg:"#1c2240", fg:"#f0a296", theme:"#12162a", font:"'Bricolage Grotesque',sans-serif", sample:"42 €"},
  {id:"foret", name:"Forêt", bg:"#1b2520", fg:"#e8a68f", theme:"#131a17", font:"'Bricolage Grotesque',sans-serif", sample:"42 €"},
  {id:"espresso", name:"Espresso", bg:"#251d18", fg:"#e89a82", theme:"#1a1512", font:"'Bricolage Grotesque',sans-serif", sample:"42 €"},
  {id:"graphite", name:"Graphite", bg:"#202224", fg:"#ee9c90", theme:"#161718", font:"'Bricolage Grotesque',sans-serif", sample:"42 €"},
  {id:"prune", name:"Prune", bg:"#251d2d", fg:"#f0a0a0", theme:"#1a1420", font:"'Bricolage Grotesque',sans-serif", sample:"42 €"}
];
const currentSkin = () => document.documentElement.dataset.skin || "ardoise";
function applySkin(id){
  if(!SKINS.some(k => k.id===id)) id = "ardoise";
  document.documentElement.dataset.skin = id;
  try{ localStorage.setItem("ardoise.skin", id); }catch{}
  const tc = SKINS.find(k => k.id===id)?.theme || "#1b2035";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", tc);
}

applySkin(currentSkin());

/* ---------- chronomètre ---------- */
const CH = (() => { try{ return JSON.parse(localStorage.getItem("ardoise.chrono")) || {acc:0, since:null}; }catch{ return {acc:0, since:null}; } })();
const chSave = () => { try{ localStorage.setItem("ardoise.chrono", JSON.stringify(CH)); }catch{} };
const chElapsed = () => CH.acc + (CH.since ? Date.now() - CH.since : 0);
function chFormat(ms){
  const t = Math.floor(ms/100), d = t%10, s = Math.floor(t/10)%60, m = Math.floor(t/600)%60, h = Math.floor(t/36000);
  const p = n => String(n).padStart(2,"0");
  return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)},${d}`;
}
let chTimer = null;
function chTick(){
  const el = $("#chrono-time"); if(el) el.textContent = chFormat(chElapsed());
  const b = $("#chrono-btn"); if(b){ b.classList.toggle("running", !!CH.since); b.setAttribute("aria-label", CH.since ? "Mettre le chronomètre en pause" : "Lancer le chronomètre"); }
}
function chSync(){ clearInterval(chTimer); chTimer = CH.since ? setInterval(chTick, 100) : null; chTick(); }
function chToggle(){
  if(CH.since){ CH.acc += Date.now() - CH.since; CH.since = null; } else CH.since = Date.now();
  chSave(); render(); chSync();
}
function chReset(){ CH.acc = 0; CH.since = null; chSave(); render(); chSync(); }
const chronoHTML = () => {
  const visible = CH.since || CH.acc > 0;
  return `${visible ? `<div class="chrono-pill${CH.since?"":" paused"}"><span id="chrono-time" class="num">${chFormat(chElapsed())}</span>
      ${CH.since ? "" : `<button class="chrono-reset" data-act="chrono-reset" aria-label="Remettre le chronomètre à zéro">↺</button>`}</div>` : ""}
    <button class="icon-btn chrono-btn${CH.since?" running":""}" id="chrono-btn" data-act="chrono" aria-label="${CH.since ? "Mettre le chronomètre en pause" : "Lancer le chronomètre"}">${ICON.chrono}</button>`;
};

/* ---------- état ---------- */
const S = {
  db:null, uid:null, myPid:undefined, adminPid:null, profiles:new Map(), profilesReady:false,
  roomIds:[], roomIdsReady:false, rooms:new Map(), loaded:new Set(), subs:{},
  online:true, slow:false, error:null, view:{name:"home"}, tab:"depenses", pendingJoin:null
};
let F = null;
const myProfile = () => S.profiles.get(S.myPid) || null;
const isAdmin = () => !!S.myPid && S.adminPid === S.myPid;

/* ---------- calculs ---------- */
function parseAmount(v){ const n = parseFloat(String(v).replace(/\s/g,"").replace(",", ".")); return isFinite(n) && n>0 ? Math.round(n*100) : 0; }
function shares(amount, split){
  const ent = Object.entries(split||{}).filter(([,w]) => w>0);
  const tot = ent.reduce((s,[,w]) => s+w, 0); if(!tot) return {};
  const res = {}; let used = 0; const rem = [];
  for(const [m,w] of ent){ const ex = amount*w/tot, f = Math.floor(ex); res[m]=f; used+=f; rem.push([m, ex-f]); }
  rem.sort((a,b) => b[1]-a[1]); let k=0;
  while(used < amount){ res[rem[k % rem.length][0]]++; used++; k++; }
  return res;
}
const PART_KINDS = [
  {k:"alcool", label:"Alcool", ico:"🍷"},
  {k:"viande", label:"Viande", ico:"🥩"},
  {k:"vege",   label:"Végé",   ico:"🥗"},
  {k:"autre",  label:"Autre",  ico:"➕"},
];
const partIco = k => (PART_KINDS.find(p => p.k===k) || PART_KINDS[3]).ico;
/* qui partage une ligne « dont » : calculé d'après l'onglet Membres pour alcool / viande / végé */
function partWho(p, e, mem){
  if(!p || p.k==="autre" || !mem) return p?.who || {};
  const inExp = m => (e.split?.[m.id]||0) > 0;
  const ok = {alcool: m => !m.diet?.noAlcohol, viande: m => !m.diet?.vege, vege: m => !!m.diet?.vege}[p.k] || (() => true);
  let list = mem.filter(m => inExp(m) && ok(m));
  if(!list.length) list = mem.filter(inExp);
  const who = {}; list.forEach(m => who[m.id] = 1); return who;
}
/* part de chacun pour une dépense, en tenant compte des lignes « dont » */
function expShares(e, mem){
  const parts = Array.isArray(e.parts) ? e.parts.filter(p => p && p.amount > 0) : [];
  const extra = parts.reduce((s,p) => s + p.amount, 0);
  const res = shares(Math.max(0, e.amount - extra), e.split);
  for(const p of parts) for(const [m,c] of Object.entries(shares(p.amount, partWho(p, e, mem)))) res[m] = (res[m]||0) + c;
  return res;
}
function balances(rid){
  const mem = membersOf(rid), bal = {}; for(const m of mem) bal[m.id] = 0;
  for(const e of expensesOf(rid)){
    bal[e.paidBy] = (bal[e.paidBy]||0) + e.amount;
    for(const [m,c] of Object.entries(expShares(e, mem))) bal[m] = (bal[m]||0) - c;
  }
  return bal;
}
function settle(bal){
  const d=[], c=[];
  for(const [m,v] of Object.entries(bal)){ if(v<0) d.push([m,-v]); else if(v>0) c.push([m,v]); }
  d.sort((a,b)=>b[1]-a[1]); c.sort((a,b)=>b[1]-a[1]);
  const out=[]; let i=0, j=0;
  while(i<d.length && j<c.length){
    const x = Math.min(d[i][1], c[j][1]);
    if(x>0) out.push({from:d[i][0], to:c[j][0], amount:x});
    d[i][1]-=x; c[j][1]-=x; if(d[i][1]===0) i++; if(c[j][1]===0) j++;
  }
  return out;
}

/* ---------- accès aux données ---------- */
function withProfile(m){
  const p = m.pid ? S.profiles.get(m.pid) : null;
  return p ? {...m, name: p.name || m.name, photo: p.photo || null, diet: {...(p.diet||{}), ...(m.diet||{})}} : m;
}
const membersOf = rid => (S.rooms.get(rid)?.members || []).map(withProfile);
const expensesOf = rid => S.rooms.get(rid)?.expenses || [];
const member = (rid, mid) => membersOf(rid).find(m => m.id===mid) || {id:mid, name:"Ancien membre"};
const meIn = rid => S.myPid ? membersOf(rid).find(m => m.pid===S.myPid) || null : null;
const roomsSorted = () => S.roomIds.map(id => S.rooms.get(id)).filter(r => r && !r.missing).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
const shareLink = rid => `${location.origin}${location.pathname}#${rid}`;
const profilesSorted = () => [...S.profiles.values()].sort((a,b)=>(a.name||"").localeCompare(b.name||"","fr"));

function hue(s){ let h=0; for(const ch of String(s)) h=(h*31+ch.charCodeAt(0))>>>0; return h%360; }
function avatar(m, size=""){
  const ok = typeof m.photo==="string" && m.photo.startsWith("data:image/");
  const init = esc((m.name||"?").trim().slice(0,1).toUpperCase());
  return `<span class="av ${size}" style="background:hsl(${hue((m.pid||m.id)+m.name)} 45% 46%)" title="${esc(m.name)}">${ok?`<img alt="" src="${m.photo}">`:init}</span>`;
}
function chip(c){ if(c<0) return `<span class="chip owe">tu dois ${money(-c)}</span>`; if(c>0) return `<span class="chip owed">on te doit ${money(c)}</span>`; return `<span class="chip owed">✓ bravo, rien à régler</span>`; }
const CONGRATS = ["Bravo, tu es à jour !","Comptes nickel, bien joué !","Rien à rembourser, chapeau !","Ardoise effacée, bravo !"];
const congrats = seed => CONGRATS[hue(seed||"x") % CONGRATS.length];

function toast(msg){ const t=$("#toastRoot"); t.innerHTML=`<div class="toast" role="status">${esc(msg)}</div>`; clearTimeout(toast.t); toast.t=setTimeout(()=>t.innerHTML="",2800); }
async function write(fn, okMsg, failMsg){
  try{ await fn(); if(okMsg) toast(okMsg); return true; }
  catch(e){
    console.error(e);
    toast(failMsg || (String(e?.code||e?.message||"").toUpperCase().includes("PERMISSION") ? "Action refusée : tu n'as pas accès à ce groupe." : "Enregistrement impossible pour l'instant. Réessaie dans un moment."));
    return false;
  }
}
const R = path => ref(S.db, path);

/* ---------- abonnements ---------- */
function watchRoom(rid){
  if(S.subs[rid] || !S.db) return;
  S.subs[rid] = onValue(R(`rooms/${rid}`), snap => {
    const v = snap.val();
    S.loaded.add(rid);
    if(!v || !v.info){ S.rooms.set(rid, {id:rid, missing:true}); render(); return; }
    const members = Object.entries(v.members||{}).map(([id,m]) => ({id, ...m})).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
    const expenses = Object.entries(v.expenses||{}).map(([id,e]) => ({id, ...e}))
      .filter(e => typeof e.amount==="number" && e.paidBy)
      .sort((a,b)=> (b.date||"").localeCompare(a.date||"") || (b.createdAt||0)-(a.createdAt||0));
    S.rooms.set(rid, {id:rid, ...v.info, members, expenses});
    render();
  }, err => {
    console.warn(err);
    delete S.subs[rid]; S.loaded.add(rid);
    S.rooms.set(rid, {id:rid, missing:true});
    render();
  });
}
function unwatchRoom(rid){ S.subs[rid]?.(); delete S.subs[rid]; S.rooms.delete(rid); S.loaded.delete(rid); }

let unsubMine = null, unsubProfiles = null, unsubAdmin = null;
function startProfileWatches(){
  unsubProfiles?.(); unsubAdmin?.();
  unsubProfiles = onValue(R("profiles"), snap => {
    S.profiles = new Map(Object.entries(snap.val()||{}).map(([pid,p]) => [pid, {pid, ...p}]));
    S.profilesReady = true;
    const want = S.myPid && S.profiles.get(S.myPid)?.skin;
    if(want && want !== currentSkin()) applySkin(want);
    render();
  }, err => { console.error(err); S.profilesReady = true; S.error = "La base refuse la lecture des profils. Les règles de sécurité ne sont peut-être pas encore à jour."; render(); });
  unsubAdmin = onValue(R("meta/admin"), snap => { S.adminPid = snap.val(); render(); }, () => {});
}
function startMyRooms(){
  unsubMine?.();
  if(!S.myPid){ S.roomIds = []; S.roomIdsReady = true; return; }
  unsubMine = onValue(R(`profiles/${S.myPid}/rooms`), snap => {
    S.roomIds = Object.keys(snap.val()||{});
    S.roomIdsReady = true;
    for(const id of Object.keys(S.subs)) if(!S.roomIds.includes(id) && id!==S.view.id) unwatchRoom(id);
    S.roomIds.forEach(watchRoom);
    render();
  }, () => { S.roomIdsReady = true; render(); });
}

/* rejoindre un groupe (lien d'invitation, ou migration) */
async function joinRoom(rid){
  if(!S.myPid) return false;
  try{
    await update(R("/"), { [`rooms/${rid}/access/${S.myPid}`]: true, [`profiles/${S.myPid}/rooms/${rid}`]: true });
    watchRoom(rid); return true;
  }catch(e){ console.warn(e); return false; }
}

/* anciens groupes mémorisés sur cet appareil avant les profils */
async function migrateLocal(){
  const old = LS.get("ardoise.rooms", []), ids = LS.get("ardoise.me", {});
  if(!old.length || !S.myPid) return;
  for(const rid of old){
    if(!ID_RE.test(rid)) continue;
    const ok = await joinRoom(rid);
    const mid = ids[rid];
    if(ok && mid){
      try{
        const s = await get(R(`rooms/${rid}/members/${mid}`));
        if(s.exists() && !s.val().pid) await update(R(`rooms/${rid}/members/${mid}`), {pid:S.myPid});
      }catch{}
    }
  }
  LS.del("ardoise.rooms"); LS.del("ardoise.me");
}

/* ---------- navigation ---------- */
function route(){
  const h = decodeURIComponent(location.hash.slice(1));
  if(ID_RE.test(h)){
    if(!S.myPid){ S.pendingJoin = h; S.view = {name:"home"}; closeSheet(); render(); return; }
    if(!S.roomIds.includes(h) && !S.subs[h]){
      S.rooms.delete(h);
      joinRoom(h).then(ok => { if(!ok){ S.rooms.set(h,{id:h, missing:true}); render(); } });
    }
    if(S.view.name!=="room" || S.view.id!==h){ S.view = {name:"room", id:h}; S.tab = "depenses"; window.scrollTo(0,0); }
  } else S.view = {name:"home"};
  closeSheet(); render();
}
const goHome = () => { history.pushState("", "", location.pathname + location.search); route(); };
const goRoom = rid => { location.hash = rid; };

/* ---------- vues ---------- */
const brandBar = (right="") => `<div class="top"><div class="brand grow">Ardoise<span>.</span></div>${right}</div>`;
function loadingHTML(msg){
  return `${brandBar()}<div class="slate"><span class="label">Ton solde</span><div class="big zero">…</div>
    <div class="sub">${S.slow ? "La base de données ne répond pas. Vérifie ta connexion internet." : msg}</div></div>`;
}
function render(){
  const app = $("#app");
  if(S.error){ app.innerHTML = `${brandBar()}<div class="notice err">${esc(S.error)}</div>`; $("#fab")?.remove(); return; }
  if(S.myPid===undefined || !S.profilesReady){ app.innerHTML = loadingHTML("Connexion…"); $("#fab")?.remove(); return; }
  if(!S.myPid || !myProfile()){ renderWelcome(); return; }
  if(S.view.name==="room"){
    const r = S.rooms.get(S.view.id);
    if(!r){ app.innerHTML = loadingHTML("Ouverture du groupe…"); $("#fab")?.remove(); return; }
    if(r.missing){ renderMissing(r.id); return; }
    renderRoom(r.id); return;
  }
  if(!S.roomIdsReady || (S.roomIds.some(id => !S.loaded.has(id)) && !roomsSorted().length)){ app.innerHTML = loadingHTML("Chargement de tes groupes…"); $("#fab")?.remove(); return; }
  renderHome();
}

function renderWelcome(){
  document.body.classList.remove("room-closed"); $("#fab")?.remove();
  const profs = profilesSorted();
  $("#app").innerHTML = `${brandBar()}
    <section class="slate">
      <span class="label">Bienvenue</span>
      <div class="big zero" style="font-size:clamp(1.8rem,8vw,2.4rem)">Combien je te dois déjà ?</div>
      <div class="sub">${S.pendingJoin ? "On t'a invité dans un groupe. Connecte-toi ou crée ton profil pour le rejoindre." : "Crée ton profil une fois, retrouve tes groupes sur tous tes appareils."}</div>
    </section>
    ${profs.length ? `<section class="list" aria-label="Profils">
      <div class="section-head"><h2>C'est qui ?</h2></div>
      <span class="hint">Touche ton prénom puis tape ton code.</span>
      <div class="who-grid">${profs.map(p => `<button class="who-btn" data-act="login-pick" data-pid="${p.pid}">${avatar(p,"who")}<span>${esc(p.name)}</span></button>`).join("")}</div>
    </section>` : ""}
    <div class="join-banner">
      <div class="join-head"><span class="join-emoji" aria-hidden="true">👋</span><div><b>Nouveau ici ? 30 secondes chrono.</b>
        <span>Pas d'e-mail, pas de mot de passe, rien à valider.</span></div></div>
      <div class="join-steps"><span><i>1</i>Ton prénom</span><span><i>2</i>Une photo, si tu veux</span><span><i>3</i>Un code à 4 chiffres</span></div>
      <button class="btn block" data-act="signup">${plusSm} ${profs.length ? "Je crée mon profil" : "Créer mon profil"}</button>
    </div>`;
}

function renderMissing(rid){
  $("#fab")?.remove(); document.body.classList.remove("room-closed");
  $("#app").innerHTML = `<div class="top"><button class="icon-btn" data-act="home" aria-label="Retour aux groupes">${ICON.back}</button><div class="grow room-title">Groupe introuvable</div></div>
    <div class="empty"><b>Ce groupe n'existe pas, a été supprimé, ou le lien est incomplet</b><span class="muted">Demande à un participant de te renvoyer le lien d'invitation.</span>
    ${S.roomIds.includes(rid) ? `<button class="btn ghost" data-act="forget" data-room="${rid}">Retirer de mes groupes</button>` : ""}</div>`;
}

function renderHome(){
  document.body.classList.remove("room-closed");
  let owe=0, owed=0; const mine=[];
  const rooms = roomsSorted(), openRooms = rooms.filter(r=>!r.closed), closedRooms = rooms.filter(r=>r.closed);
  for(const r of rooms){
    const me = meIn(r.id); if(!me) continue;
    for(const t of settle(balances(r.id))){
      if(t.from===me.id){ owe+=t.amount; mine.push({...t, room:r, dir:"owe"}); }
      if(t.to===me.id){ owed+=t.amount; mine.push({...t, room:r, dir:"owed"}); }
    }
  }
  mine.sort((a,b)=> (a.dir===b.dir?0:a.dir==="owe"?-1:1) || b.amount-a.amount);
  const noMe = rooms.length && rooms.every(r => !meIn(r.id));
  const allGood = !owe && !owed && rooms.length && !noMe;
  const me = myProfile();

  $("#app").innerHTML = `
  ${brandBar(`${chronoHTML()}<button class="me-btn" data-act="my-profile" aria-label="Mon profil">${avatar({...me, pid:S.myPid})}</button>`)}
  ${S.online ? "" : `<div class="notice">Hors ligne : tes modifications seront envoyées au retour de la connexion.</div>`}
  <section class="slate" aria-label="Ton solde">
    <span class="label">${owe ? "Tu dois au total" : owed ? "On te doit au total" : `Salut ${esc(me.name)}`}</span>
    <div class="big ${owe?"owe":owed?"owed":allGood?"owed":"zero"}">${allGood ? esc(congrats(S.myPid)) : (owe||owed) ? money(owe||owed) : money(0)}</div>
    <div class="sub">${owe && owed ? `Et on te doit <b class="num">${money(owed)}</b> de ton côté.` :
      noMe ? "Ouvre un groupe et indique qui tu es pour voir ton solde." :
      allGood ? "Tu ne dois rien à personne et personne ne te doit rien. Merci d'être réglo !" :
      !rooms.length ? "Crée un groupe, ou ouvre le lien qu'un ami t'a envoyé." : ""}</div>
    ${mine.length ? `<div class="stack">${mine.map(t => {
      const other = member(t.room.id, t.dir==="owe" ? t.to : t.from);
      return `<div class="debt">${avatar(other)}
        <div class="who"><b>${t.dir==="owe" ? `Tu dois à ${esc(other.name)}` : `${esc(other.name)} te doit`}</b><small>${esc(t.room.name)}</small></div>
        <span class="amt ${t.dir}">${money(t.amount)}</span>
        <button class="pill-btn" data-act="settle" data-room="${t.room.id}" data-from="${t.from}" data-to="${t.to}" data-amount="${t.amount}">Réglé</button>
      </div>`; }).join("")}</div>` : ""}
  </section>

  <section class="list" aria-label="Groupes">
    <div class="section-head"><h2>Tes groupes</h2><span class="muted num">${openRooms.length || ""}</span></div>
    ${openRooms.length ? openRooms.map(roomCard).join("") :
      `<div class="empty"><b>${rooms.length ? "Aucun groupe en cours" : "Aucun groupe pour l'instant"}</b><span class="muted">Un groupe par événement : un week-end, une coloc, un anniversaire…</span></div>`}
    <button class="btn ghost block" data-act="new-room">${plusSm} Nouveau groupe</button>
  </section>
  ${closedRooms.length ? `<section class="list" aria-label="Groupes clôturés">
    <div class="section-head"><h2>Groupes clôturés</h2><span class="muted num">${closedRooms.length}</span></div>
    ${closedRooms.map(roomCard).join("")}</section>` : ""}`;
  $("#fab")?.remove();
}

function roomCard(r){
  const me = meIn(r.id), mem = membersOf(r.id), b = me ? (balances(r.id)[me.id]||0) : null;
  const tot = expensesOf(r.id).filter(e=>e.kind!=="transfer").reduce((s,e)=>s+e.amount,0);
  return `<button class="room-card${r.closed?" closed":""}" data-act="open" data-room="${r.id}">
    <div class="info"><span class="name">${esc(r.name)}</span>
      <div class="faces">${mem.slice(0,6).map(m=>avatar(m,"sm")).join("")}${mem.length>6?`<span class="muted" style="align-self:center;margin-left:6px;font-size:.8rem">+${mem.length-6}</span>`:""}</div></div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
      ${r.closed && !b ? `<span class="chip zero">🔒 clôturé</span>` : me ? chip(b) : `<span class="chip zero">qui es-tu ?</span>`}
      <span class="muted num" style="font-size:.8rem">${money(tot)} dépensés</span></div>
  </button>`;
}

function renderRoom(rid){
  const r = S.rooms.get(rid), mem = membersOf(rid), exps = expensesOf(rid), me = meIn(rid);
  const bal = balances(rid), plan = settle(bal);
  const myB = me ? (bal[me.id]||0) : 0;
  const editable = !r.closed;
  const mineT = me ? plan.filter(t => t.from===me.id || t.to===me.id) : [];
  const total = exps.filter(e=>e.kind!=="transfer").reduce((s,e)=>s+e.amount,0);

  let meBlock = "";
  if(!me && r.createdBy===S.myPid && !S.claimOpen?.[rid]){
    meBlock = `<div class="notice organizer">Tu organises ce groupe sans y participer : tu vois et gères tout, mais tu n'as rien à payer.
      ${editable ? `<button class="pill-btn" data-act="claim-open">Je participe aussi</button>` : ""}</div>`;
  } else if(!me){
    const free = mem.filter(m => !m.pid);
    meBlock = `<div class="claim"><b>Qui es-tu dans ce groupe ?</b>
      ${free.length ? `<span class="hint">Touche ton prénom pour relier ce groupe à ton profil.</span>
      <div class="pick-row">${free.map(m=>`<button class="pick" data-act="claim" data-mid="${m.id}">${avatar(m,"sm")}${esc(m.name)}</button>`).join("")}</div>` : ""}
      ${editable ? `<button class="btn ghost" data-act="claim-new">${plusSm} ${free.length ? "Je ne suis pas dans la liste, ajoute-moi" : "Ajoute-moi au groupe"}</button>` : ""}</div>`;
  } else {
    meBlock = `<div class="me-card">
      <div class="me-line">${avatar(me,"lg")}<div class="grow"><span class="label">${myB<0?"Tu dois":myB>0?"On te doit":"Ton solde"}</span>
        <div class="me-amt ${myB<0?"owe":"owed"}">${myB ? money(Math.abs(myB)) : esc(congrats(rid+me.id))}</div>
        ${myB ? "" : `<span class="hint">Tu ne dois rien et on ne te doit rien dans ce groupe. Merci d'être réglo !</span>`}</div></div>
      ${mineT.map(t => { const o = member(rid, t.from===me.id ? t.to : t.from), out = t.from===me.id;
        return `<div class="row" style="background:var(--surface-2)">${avatar(o,"sm")}<div class="grow"><div class="t">${out ? `Tu dois à ${esc(o.name)}` : `${esc(o.name)} te doit`}</div></div>
          <b class="num" style="color:var(${out?"--owe":"--owed"})">${money(t.amount)}</b>
          <button class="pill-btn" data-act="settle" data-room="${rid}" data-from="${t.from}" data-to="${t.to}" data-amount="${t.amount}">Réglé</button></div>`; }).join("")}
    </div>`;
  }

  let body = "";
  if(S.tab==="depenses"){
    if(!exps.length) body = `<div class="empty"><b>Aucune dépense</b><span class="muted">Ajoute la première : qui a payé, combien, et pour qui.</span></div>`;
    else {
      let last = ""; body = `<div class="total-bar"><span class="label">Total du groupe</span><b class="num">${money(total)}</b></div>`;
      for(const e of exps){
        if(e.date !== last){ last = e.date; body += `<div class="day">${dayLabel(e.date)}</div>`; }
        const p = member(rid, e.paidBy), sh = expShares(e, mem), myShare = me ? (sh[me.id]||0) : 0;
        const parts = Object.values(e.split||{}).reduce((s,w)=>s+(w>0?w:0),0);
        if(e.kind==="transfer"){
          const to = member(rid, Object.keys(e.split||{})[0]);
          body += `<button class="row transfer" data-act="edit-exp" data-eid="${e.id}">${avatar(p,"sm")}<span class="arrow">${ICON.arrow}</span>${avatar(to,"sm")}
            <div class="grow"><div class="t">Remboursement</div><div class="s">${esc(p.name)} → ${esc(to.name)}</div></div><div class="r"><b>${money(e.amount)}</b></div></button>`;
        } else {
          body += `<button class="row" data-act="edit-exp" data-eid="${e.id}">${avatar(p)}
            <div class="grow"><div class="t">${esc(e.title||"Dépense")}</div><div class="s">${esc(p.name)} a payé · ${parts} part${parts>1?"s":""}${(e.parts||[]).filter(x=>x&&x.amount>0).map(x => ` · ${partIco(x.k)} dont ${money(x.amount)}`).join("")}</div></div>
            <div class="r"><b>${money(e.amount)}</b>${me ? `<small>${myShare?`ta part ${money(myShare)}`:"pas concerné"}</small>`:""}</div></button>`;
        }
      }
    }
  } else if(S.tab==="equilibres"){
    body = `<div class="label" style="padding:0 4px">Soldes</div>` + mem.map(m => { const b = bal[m.id]||0;
      return `<div class="row">${avatar(m,"sm")}<div class="grow"><div class="t">${esc(m.name)}${m.id===me?.id?" <span class='muted'>(toi)</span>":""}</div></div>
        ${b ? `<b class="num" style="color:var(${b<0?"--owe":"--owed"})">${b>0?"+":""}${money(b)}</b>` : `<span class="chip owed">✓ bravo, à jour</span>`}</div>`; }).join("");
    body += `<div class="label" style="padding:8px 4px 0">Qui doit quoi à qui</div>`;
    body += plan.length ? plan.map(t => { const f = member(rid,t.from), to = member(rid,t.to);
      return `<div class="row settle"><div class="names">${avatar(f,"sm")}<b>${esc(f.name)}</b><span class="arrow">${ICON.arrow}</span>${avatar(to,"sm")}<b>${esc(to.name)}</b></div>
        <b class="num">${money(t.amount)}</b><button class="pill-btn" data-act="settle" data-room="${rid}" data-from="${t.from}" data-to="${t.to}" data-amount="${t.amount}">Réglé</button></div>`; }).join("")
      : `<div class="notice" style="background:var(--owed-soft);color:var(--owed);font-weight:600">🎉 Bravo à tous, tout le monde est à jour !</div>`;
    body += `<p class="hint" style="margin:0 4px">Le nombre de remboursements est réduit au minimum. « Réglé » enregistre le paiement dans les dépenses.</p>`;
  } else {
    body = mem.map(m => `<div class="row member-row"><button class="member-main" data-act="edit-member" data-mid="${m.id}">${avatar(m)}<div class="grow"><div class="t">${esc(m.name)}</div>
      <div class="s">${m.id===me?.id ? "C'est toi" : m.pid ? "A un profil Ardoise" : "Pas encore de profil"}</div></div></button>
      <div class="diet">
        <button class="diet-btn${m.diet?.vege ? " on" : ""}" data-act="diet" data-mid="${m.id}" data-f="vege" aria-pressed="${!!m.diet?.vege}" title="Végétarien" ${editable?"":"disabled"}><span aria-hidden="true">🥗</span><span class="sr-only">Végétarien</span></button>
        <button class="diet-btn${m.diet?.noAlcohol ? "" : " on"}" data-act="diet" data-mid="${m.id}" data-f="noAlcohol" aria-pressed="${!m.diet?.noAlcohol}" title="${m.diet?.noAlcohol ? "Ne boit pas d'alcool" : "Boit de l'alcool"}" ${editable?"":"disabled"}><span aria-hidden="true">🍷</span><span class="sr-only">Boit de l'alcool</span></button>
      </div></div>`).join("")
      + `<p class="hint" style="margin:0 4px">🥗 allumé : végétarien · 🍷 éteint : ne boit pas d'alcool. Les lignes « dont alcool » et « dont viande » en tiennent compte automatiquement.</p>`
      + (editable ? `<button class="btn ghost block" data-act="add-member">${plusSm} Ajouter des participants</button>` : "");
  }

  document.body.classList.toggle("room-closed", !!r.closed);
  $("#app").innerHTML = `
    <div class="top sticky"><button class="icon-btn" data-act="home" aria-label="Retour aux groupes">${ICON.back}</button>
      <div class="grow room-title">${esc(r.name)}</div>
      <button class="icon-btn" data-act="invite" aria-label="Inviter des amis">${ICON.share}</button>
      ${r.closed ? `<button class="pill-btn" data-act="room-reopen">Rouvrir</button>` : `<button class="pill-btn" data-act="room-close-ask">🔒 Clôturer</button>`}
      <button class="icon-btn" data-act="room-settings" aria-label="Réglages du groupe">${ICON.gear}</button></div>
    ${r.closed ? (() => { const n = exps.filter(e=>e.kind!=="transfer").length, left = plan.reduce((s,t)=>s+t.amount,0);
      return `<section class="recap" aria-label="Bilan du groupe">
        <div class="recap-head"><b>🔒 Groupe clôturé${r.closedAt ? ` le ${new Date(r.closedAt).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}` : ""}</b>
          ${left ? `<span class="chip owe">reste ${money(left)} à régler</span>` : `<span class="chip owed">✓ tout le monde est à jour</span>`}</div>
        <div class="recap-grid"><div><strong>${n}</strong><span>dépense${n>1?"s":""}</span></div>
          <div><strong>${money(total)}</strong><span>partagés</span></div>
          <div><strong>${mem.length}</strong><span>participant${mem.length>1?"s":""}</span></div></div>
        <span class="hint">On ne peut plus ajouter ni modifier de dépenses${left ? ", mais les remboursements restants peuvent encore être réglés" : ""}.</span>
      </section>`; })() : ""}
    ${meBlock}
    <div class="invite-bar"><div class="grow"><span class="label">Lien pour rejoindre le groupe</span><span class="invite-url">${esc(shareLink(rid).replace(/^https?:\/\//,""))}</span></div>
      <button class="btn" data-act="copy-room-link">Copier</button></div>
    <div class="tabs" role="tablist">
      ${[["depenses","Dépenses"],["equilibres","Équilibres"],["membres","Membres"]].map(([k,l])=>`<button role="tab" aria-selected="${S.tab===k}" data-act="tab" data-tab="${k}">${l}</button>`).join("")}
    </div>
    <div class="list">${body}</div>
    ${r.closed ? `<button class="btn ghost block" data-act="room-reopen">Rouvrir l'événement</button>`
               : `<button class="btn ghost block close-btn" data-act="room-close-ask">🔒 Clôturer l'événement</button>`}`;

  let fab = $("#fab");
  if(editable && mem.length){
    if(!fab){ fab = document.createElement("button"); fab.id="fab"; fab.className="fab"; fab.dataset.act="add-exp"; fab.innerHTML = ICON.plus+" Dépense"; document.body.appendChild(fab); }
  } else fab?.remove();
}

function today(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function dayLabel(iso){
  if(!iso) return "";
  if(iso===today()) return "Aujourd'hui";
  return new Date(iso+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
}

/* ---------- fenêtres ---------- */
function openSheet(html){
  $("#sheetRoot").innerHTML = `<div class="scrim" data-act="close-scrim"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div></div>`;
  setTimeout(()=>$(".sheet input")?.focus({preventScroll:true}), 60);
}
function closeSheet(){ $("#sheetRoot").innerHTML=""; F=null; }
const closeBtn = `<button class="pill-btn" data-act="close">Fermer</button>`;
const pinField = (id, label, hint="") => `<div class="field"><label for="${id}">${label}</label>
  <input type="password" inputmode="numeric" autocomplete="off" maxlength="6" id="${id}" class="pin-input" placeholder="••••">${hint?`<span class="hint">${hint}</span>`:""}</div>`;
const photoBlock = (seed, name, photo) => `<div class="photo-pick"><span id="f-av">${avatar({id:seed, name:name||"?", photo},"xl")}</span>
  <div class="inline-actions"><button class="btn ghost" data-act="pick-photo">${photo?"Changer la photo":"Ajouter une photo"}</button>
  ${photo?`<button class="btn ghost" data-act="rm-photo">Retirer</button>`:""}</div></div>`;
function refreshPhoto(){ $("#f-av").innerHTML = avatar({id:F.seed||"new", name:$("#f-name")?.value||F.name||"?", photo:F.photo},"xl"); }

/* inscription */
function sheetSignup(){
  F = {type:"signup", seed:"new", photo:null};
  openSheet(`<div class="sheet-head"><h2>Créer mon profil</h2>${closeBtn}</div>
    ${photoBlock("new","",null)}
    <div class="field"><label for="f-name">Prénom ou surnom</label><input type="text" id="f-name" maxlength="30" placeholder="Ton prénom"></div>
    <span class="hint">Une photo aide tes amis à te reconnaître, surtout s'il y a plusieurs personnes avec le même prénom.</span>
    ${pinField("f-pin","Choisis un code (4 à 6 chiffres)","Il sert à te connecter sur un autre téléphone ou ordinateur.")}
    ${pinField("f-pin2","Confirme ton code")}
    <button class="btn block" data-act="signup-ok">Créer mon profil</button>`);
}
async function doSignup(btn){
  const name = $("#f-name").value.trim(), pin = $("#f-pin").value, pin2 = $("#f-pin2").value;
  if(!name){ toast("Indique ton prénom."); return; }
  if(profilesSorted().some(p => (p.name||"").toLowerCase()===name.toLowerCase()) && !F.dupOk){
    F.dupOk = true; toast(`Il y a déjà un « ${name} ». Ajoute une initiale ou une photo, ou touche à nouveau pour confirmer.`); return;
  }
  if(!PIN_RE.test(pin)){ toast("Le code doit faire 4 à 6 chiffres."); return; }
  if(pin!==pin2){ toast("Les deux codes ne sont pas identiques."); return; }
  btn.disabled = true;
  const pid = randomId(16), h = await pinHash(pid, pin);
  const up = {
    [`profiles/${pid}`]: {name, photo:F.photo||null, createdAt:Date.now()},
    [`secrets/${pid}`]: {pinHash:h},
    [`devices/${S.uid}`]: {pid, proof:h},
  };
  if(!S.adminPid) up["meta/admin"] = pid;
  const ok = await write(() => update(R("/"), up), `Bienvenue ${name} !`);
  if(!ok) btn.disabled = false;
}

/* connexion */
function sheetLogin(pid){
  const p = S.profiles.get(pid); if(!p) return;
  F = {type:"login", pid, tries:0};
  openSheet(`<div class="sheet-head"><h2>Bonjour ${esc(p.name)}</h2>${closeBtn}</div>
    <div class="photo-pick">${avatar(p,"xl")}<span class="hint">Tape ton code pour te connecter sur cet appareil.</span></div>
    ${pinField("f-pin","Ton code")}
    <button class="btn block" data-act="login-ok">Me connecter</button>
    <span class="hint">Code oublié ? Demande à l'administrateur d'Ardoise de t'en donner un nouveau.</span>`);
  $("#f-pin").addEventListener("keydown", e => { if(e.key==="Enter") $("[data-act=login-ok]")?.click(); });
}
async function doLogin(btn){
  const pin = $("#f-pin").value;
  if(!PIN_RE.test(pin)){ toast("Le code fait 4 à 6 chiffres."); return; }
  btn.disabled = true;
  const h = await pinHash(F.pid, pin);
  try{ await set(R(`devices/${S.uid}`), {pid:F.pid, proof:h}); toast(`Content de te revoir ${S.profiles.get(F.pid)?.name||""} !`); }
  catch{ btn.disabled = false; $("#f-pin").value = ""; $("#f-pin").focus(); toast("Code incorrect."); }
}

/* mon profil */
function sheetMyProfile(){
  const p = myProfile();
  F = {type:"me", seed:S.myPid, name:p.name, photo:p.photo||null};
  const others = profilesSorted().filter(x => x.pid!==S.myPid);
  openSheet(`<div class="sheet-head"><h2>Mon profil</h2>${closeBtn}</div>
    ${photoBlock(S.myPid, p.name, F.photo)}
    <div class="field"><label for="f-name">Prénom ou surnom</label><input type="text" id="f-name" maxlength="30" value="${esc(p.name)}"></div>
    <button class="btn block" data-act="me-save">Enregistrer</button>
    <div class="field"><label>Mes préférences</label>
      <button class="switch-row" data-act="me-diet" data-f="vege" role="switch" aria-checked="${!!p.diet?.vege}"><span>🥗 Je suis végétarien·ne</span><span class="switch${p.diet?.vege?" on":""}"></span></button>
      <button class="switch-row" data-act="me-diet" data-f="noAlcohol" role="switch" aria-checked="${!!p.diet?.noAlcohol}"><span>🍷 Je ne bois pas d'alcool</span><span class="switch${p.diet?.noAlcohol?" on":""}"></span></button>
      <span class="hint">Appliqué automatiquement dans tous tes groupes, présents et futurs, pour les lignes « dont alcool / viande / végé ».</span></div>
    <details class="fold"><summary>Changer mon code</summary>
      ${pinField("f-pin","Nouveau code (4 à 6 chiffres)")}${pinField("f-pin2","Confirme le nouveau code")}
      <button class="btn ghost block" data-act="me-pin">Changer mon code</button></details>
    ${isAdmin() ? `<details class="fold"><summary>Administration · ${others.length} ami${others.length>1?"s":""}</summary>
      <span class="hint">Tu es l'administrateur. Si un ami a oublié son code, donne-lui-en un nouveau ici.</span>
      <div class="list" style="gap:6px">${others.map(o => `<div class="row" style="background:var(--surface)">${avatar(o,"sm")}<div class="grow"><div class="t">${esc(o.name)}</div></div>
        <button class="pill-btn" data-act="admin-reset" data-pid="${o.pid}">Nouveau code</button></div>`).join("") || `<span class="hint">Personne d'autre n'a encore de profil.</span>`}</div>
    </details>` : ""}
    ${SKINS.length < 2 ? "" : `<div class="field"><label for="f-skin">Apparence</label>
      <div class="skin-select"><span class="skin-dot" id="f-skin-dot" style="background:${SKINS.find(k=>k.id===currentSkin())?.bg};color:${SKINS.find(k=>k.id===currentSkin())?.fg}">€</span>
      <select id="f-skin">${SKINS.map(k => `<option value="${k.id}"${currentSkin()===k.id?" selected":""}>${k.name}</option>`).join("")}</select></div>
      <span class="hint">Ton choix te suit sur tous tes appareils.</span></div>`}
    <button class="btn ghost block" data-act="logout">Me déconnecter de cet appareil</button>`);
}
function sheetAdminReset(pid){
  const p = S.profiles.get(pid); if(!p) return;
  F = {type:"reset", pid};
  openSheet(`<div class="sheet-head"><h2>Nouveau code pour ${esc(p.name)}</h2>${closeBtn}</div>
    <div class="photo-pick">${avatar(p,"lg")}<span class="hint">Choisis un code et communique-le à ${esc(p.name)}. Il pourra le changer ensuite dans son profil.</span></div>
    <div class="field"><label for="f-newpin">Nouveau code (4 à 6 chiffres)</label><input type="text" inputmode="numeric" maxlength="6" id="f-newpin" class="pin-input" autocomplete="off"></div>
    <div class="two"><button class="btn ghost" data-act="close">Annuler</button><button class="btn" data-act="admin-reset-ok">Valider</button></div>`);
}

/* groupes */
const othersFold = (open=false) => `<details class="fold quiet"${open?" open":""}><summary>${plusSm} Ajouter quelqu'un qui n'a pas de profil</summary>
      <div style="display:flex;gap:8px"><input type="text" id="f-other" maxlength="30" placeholder="Prénom" style="flex:1" aria-label="Prénom"><button class="btn ghost" data-act="room-add-other">Ajouter</button></div>
      <span class="hint">La personne apparaît dans la liste au-dessus. Elle pourra relier son profil plus tard grâce au lien d'invitation.</span></details>`;
const friendPicker = list => `<div class="pick-row" id="f-friends">${list.map(p => `<button class="pick" data-act="pick-friend" data-pid="${p.pid}" aria-pressed="false">${avatar(p,"sm")}${esc(p.name)}${p.pid===S.myPid?" <span class='muted'>(moi)</span>":""}</button>`).join("")}</div>`;

function sheetNewRoom(){
  F = {type:"room", picked:new Set(), others:[]};
  const people = [myProfile() && {...myProfile(), pid:S.myPid}, ...profilesSorted().filter(p => p.pid!==S.myPid)].filter(Boolean);
  openSheet(`<div class="sheet-head"><h2>Nouveau groupe</h2>${closeBtn}</div>
    <div class="field"><label for="f-room">Nom de l'événement</label><input type="text" id="f-room" maxlength="60" placeholder="Week-end à Annecy"></div>
    <div class="field"><label>Qui participe ?</label>
      ${friendPicker(people)}
      <span class="hint">Touche chaque participant, toi compris si tu participes aux dépenses.</span>
      ${othersFold(people.length <= 1)}</div>
    <button class="btn block" data-act="room-create">Créer le groupe</button>`);
  $("#f-other").addEventListener("keydown", e => { if(e.key==="Enter"){ e.preventDefault(); addOther(); } });
}
function addOther(){ const i=$("#f-other"); const v=i.value.trim(); if(!v) return; F.others.push(v); i.value=""; i.focus(); drawOthers(); }
function drawOthers(){
  const row = $("#f-friends"); if(!row) return;
  row.querySelectorAll(".manual").forEach(e => e.remove());
  row.insertAdjacentHTML("beforeend", F.others.map((n,i) => `<span class="pick on manual">${avatar({id:"m"+n, name:n},"sm")}${esc(n)}<button class="pick-x" data-act="room-rm-other" data-i="${i}" aria-label="Retirer ${esc(n)}">×</button></span>`).join(""));
}

async function createRoom(btn){
  const name=$("#f-room").value.trim();
  const pending=$("#f-other").value.trim(); if(pending) F.others.push(pending);
  if(!name){ toast("Donne un nom au groupe."); return; }
  if(!F.picked.size && !F.others.length){ toast("Choisis au moins un participant."); return; }
  btn.disabled = true;
  const rid = randomId(22), now = Date.now(), pids = [...F.picked];
  const up = { [`rooms/${rid}/info`]: {name, createdAt:now, closed:false, createdBy:S.myPid}, [`rooms/${rid}/access/${S.myPid}`]: true, [`profiles/${S.myPid}/rooms/${rid}`]: true };
  pids.forEach((pid,k) => {
    up[`rooms/${rid}/access/${pid}`] = true;
    up[`rooms/${rid}/members/${randomId(10)}`] = {pid, name:S.profiles.get(pid)?.name||"", createdAt:now+k};
    up[`profiles/${pid}/rooms/${rid}`] = true;
  });
  F.others.forEach((o,k) => { up[`rooms/${rid}/members/${randomId(10)}`] = {name:o, createdAt:now+pids.length+k}; });
  const needInvite = F.others.length > 0;
  const ok = await write(() => update(R("/"), up), "Groupe créé");
  if(ok){ closeSheet(); watchRoom(rid); goRoom(rid); if(needInvite) setTimeout(()=>sheetInvite(rid, true), 500); }
  else btn.disabled = false;
}

function sheetInvite(rid, fresh){
  const link = shareLink(rid), r = S.rooms.get(rid);
  F = {type:"invite", rid, title: r?.name || "Ardoise"};
  openSheet(`<div class="sheet-head"><h2>${fresh ? "Groupe créé, invite tes amis" : "Inviter des amis"}</h2>${closeBtn}</div>
    <p class="hint" style="margin:0">Les amis qui ont un profil Ardoise et que tu as ajoutés voient déjà le groupe. Pour les autres, envoie ce lien sur WhatsApp, Messenger ou par SMS : ils créeront leur profil puis rejoindront le groupe.</p>
    <div class="field"><label for="f-link">Lien du groupe</label><input type="text" id="f-link" readonly value="${esc(link)}"></div>
    <div class="two"><button class="btn ghost" data-act="copy-link">Copier le lien</button>
      ${navigator.share ? `<button class="btn" data-act="native-share">Partager…</button>` : `<button class="btn" data-act="close">OK</button>`}</div>`);
}

/* participants */
function sheetAddMembers(rid){
  const inRoom = new Set(membersOf(rid).map(m=>m.pid).filter(Boolean));
  const friends = profilesSorted().filter(p => !inRoom.has(p.pid));
  F = {type:"add-members", rid, picked:new Set(), others:[], seed:"new", photo:null};
  openSheet(`<div class="sheet-head"><h2>Ajouter des participants</h2>${closeBtn}</div>
    <div class="field"><label>Qui ajouter ?</label>
      ${friendPicker(friends)}${friends.length ? "" : `<span class="hint">Tous les amis inscrits sont déjà dans le groupe.</span>`}
      ${othersFold(!friends.length)}</div>
    <button class="btn block" data-act="add-members-ok">Ajouter au groupe</button>`);
  $("#f-other").addEventListener("keydown", e => { if(e.key==="Enter"){ e.preventDefault(); addOther(); } });
}
async function addMembers(btn){
  const pending=$("#f-other").value.trim(); if(pending) F.others.push(pending);
  if(!F.picked.size && !F.others.length){ toast("Choisis au moins une personne."); return; }
  btn.disabled = true;
  const {rid} = F, now = Date.now(), up = {};
  [...F.picked].forEach((pid,k) => {
    up[`rooms/${rid}/access/${pid}`] = true;
    up[`rooms/${rid}/members/${randomId(10)}`] = {pid, name:S.profiles.get(pid)?.name||"", createdAt:now+k};
    up[`profiles/${pid}/rooms/${rid}`] = true;
  });
  F.others.forEach((o,k) => { up[`rooms/${rid}/members/${randomId(10)}`] = {name:o, createdAt:now+100+k}; });
  if(await write(() => update(R("/"), up), "Participants ajoutés")) closeSheet(); else btn.disabled = false;
}

function sheetMember(rid, mid){
  const m = member(rid, mid), me = meIn(rid);
  const used = expensesOf(rid).some(e => e.paidBy===mid || (e.split && e.split[mid]>0));
  if(m.pid){
    const mine = m.pid===S.myPid;
    F = {type:"member-view", rid, mid};
    openSheet(`<div class="sheet-head"><h2>${esc(m.name)}</h2>${closeBtn}</div>
      <div class="photo-pick">${avatar(m,"xl")}<span class="hint">${mine ? "C'est toi. Ton prénom et ta photo se modifient dans ton profil, et changent dans tous tes groupes." : `${esc(m.name)} a un profil Ardoise. Son prénom et sa photo sont gérés depuis son profil.`}</span></div>
      ${mine ? `<button class="btn ghost block" data-act="my-profile">Modifier mon profil</button>` : ""}
      ${mine ? `<button class="btn ghost block" data-act="unclaim">Ce n'est pas moi</button>` : ""}
      ${used ? `<p class="hint" style="margin:0">Cette personne apparaît dans des dépenses : retire-la d'abord de ces dépenses pour pouvoir la retirer du groupe.</p>`
        : `<button class="btn danger block" data-act="member-del">Retirer ${esc(m.name)} du groupe</button>`}`);
    return;
  }
  F = {type:"member", rid, mid, seed:mid, photo: m.photo || null, confirmDel:false};
  const linkable = profilesSorted().filter(p => !membersOf(rid).some(x => x.pid===p.pid));
  openSheet(`<div class="sheet-head"><h2>Modifier</h2>${closeBtn}</div>
    ${photoBlock(mid, m.name, F.photo)}
    <div class="field"><label for="f-name">Prénom ou surnom</label><input type="text" id="f-name" maxlength="30" value="${esc(m.name)}"></div>
    ${!me ? `<button class="btn ghost block" data-act="claim-here">C'est moi</button>` : ""}
    ${linkable.length ? `<div class="field"><label>Relier au profil d'un ami</label>
      <div class="pick-row">${linkable.map(p => `<button class="pick" data-act="link-profile" data-pid="${p.pid}">${avatar(p,"sm")}${esc(p.name)}</button>`).join("")}</div>
      <span class="hint">Le groupe apparaîtra alors dans ses groupes, avec sa photo.</span></div>` : ""}
    <button class="btn block" data-act="member-save">Enregistrer</button>
    ${used ? `<p class="hint" style="margin:0">Cette personne apparaît dans des dépenses : retire-la d'abord de ces dépenses pour pouvoir la supprimer.</p>`
      : `<button class="btn danger block" data-act="member-del">Supprimer ${esc(m.name)}</button>`}`);
}

async function fileToAvatar(file){
  const url = URL.createObjectURL(file);
  try{
    const img = new Image(); await new Promise((ok,ko)=>{img.onload=ok; img.onerror=ko; img.src=url;});
    const s=192, c=document.createElement("canvas"); c.width=c.height=s;
    const m=Math.min(img.naturalWidth,img.naturalHeight);
    c.getContext("2d").drawImage(img,(img.naturalWidth-m)/2,(img.naturalHeight-m)/2,m,m,0,0,s,s);
    return c.toDataURL("image/jpeg",0.82);
  } finally { URL.revokeObjectURL(url); }
}

async function linkMember(rid, mid, pid, msg){
  return write(() => update(R("/"), {
    [`rooms/${rid}/members/${mid}/pid`]: pid,
    [`rooms/${rid}/access/${pid}`]: true,
    [`profiles/${pid}/rooms/${rid}`]: true,
  }), msg);
}

/* dépenses */
function sheetExpense(rid, eid){
  const e = eid ? expensesOf(rid).find(x=>x.id===eid) : null, me = meIn(rid), mem = membersOf(rid);
  const split = {}; for(const m of mem) split[m.id] = e ? (e.split?.[m.id]||0) : 1;
  F = {type:"expense", rid, eid, kind:e?.kind||"expense", paidBy: e?.paidBy || me?.id || mem[0]?.id, split, confirmDel:false, createdAt:e?.createdAt,
    parts: (e?.parts||[]).filter(Boolean).map(p => ({k:p.k||"autre", label:p.label||"Autre", amountStr:String(p.amount/100).replace(".",","), who:{...(p.who||{})}}))};
  const isT = F.kind==="transfer";
  openSheet(`<div class="sheet-head"><h2>${isT ? "Remboursement" : e ? "Modifier la dépense" : "Nouvelle dépense"}</h2>${closeBtn}</div>
    ${isT ? "" : `<div class="field"><label for="f-title">Quoi ?</label><input type="text" id="f-title" maxlength="60" value="${esc(e?.title||"")}" placeholder="Courses, essence, resto…"></div>`}
    <div class="two">
      <div class="field"><label for="f-amount">Montant (€)</label><input type="text" inputmode="decimal" id="f-amount" class="amount-input" value="${e?String(e.amount/100).replace(".",","):""}" placeholder="0,00"></div>
      <div class="field"><label for="f-date">Date</label><input type="date" id="f-date" value="${e?.date||today()}"></div>
    </div>
    <div class="field"><label>${isT?"Qui a remboursé ?":"Qui a payé ?"}</label><div class="pick-row" id="f-payer"></div></div>
    <div class="field"><label>${isT?"Remboursé à":"Pour qui ?"}</label>
      ${isT ? "" : `<div class="inline-actions"><button class="pill-btn" data-act="split-all">Tout le monde</button><button class="pill-btn" data-act="split-none">Personne</button></div>`}
      <div class="list" id="f-split" style="gap:6px"></div>
      ${isT ? "" : `<span class="hint">Une part par personne. Mets 2 parts si quelqu'un paie aussi pour un invité ou un conjoint.</span>`}</div>
    ${isT ? "" : `<div class="field"><label>Dont…</label>
      <span class="hint">Une partie que tout le monde n'a pas consommée ? Ajoute-la ici : elle est retirée du total et partagée seulement entre ceux qui en ont profité.</span>
      <div id="f-parts" class="list" style="gap:10px"></div>
      <div class="inline-actions">${PART_KINDS.map(p => `<button class="pill-btn" data-act="part-add" data-k="${p.k}">${p.ico} Dont ${p.label.toLowerCase()}</button>`).join("")}</div></div>`}
    <button class="btn block" data-act="exp-save">${e ? "Enregistrer" : "Ajouter la dépense"}</button>
    ${e ? `<button class="btn danger block" data-act="exp-del">Supprimer</button>` : ""}`);
  drawPayer(); drawParts(); drawSplit();
  $("#f-amount").addEventListener("input", drawSplit);
}
function drawPayer(){
  $("#f-payer").innerHTML = membersOf(F.rid).map(m => `<button class="pick ${m.id===F.paidBy?"on":""}" data-act="payer" data-mid="${m.id}" aria-pressed="${m.id===F.paidBy}">${avatar(m,"sm")}${esc(m.name)}</button>`).join("");
}
function formParts(){ return (F.parts||[]).map(p => ({k:p.k, label:p.label, amount:parseAmount(p.amountStr), who:p.who})); }
function drawParts(){
  const box = $("#f-parts"); if(!box) return;
  const mem = membersOf(F.rid);
  box.innerHTML = (F.parts||[]).map((p,i) => {
    const auto = p.k !== "autre", amt = parseAmount(p.amountStr);
    const n = Object.values(auto ? partWho(p, {split:F.split}, mem) : p.who).filter(w => w>0).length;
    return `<div class="part-card">
      <div class="part-head"><span class="part-ico" aria-hidden="true">${partIco(p.k)}</span>
        ${p.k==="autre" ? `<input type="text" class="part-label" data-i="${i}" maxlength="24" value="${esc(p.label)}" placeholder="Quoi ?" aria-label="Nom de la partie">` : `<b>Dont ${esc(p.label.toLowerCase())}</b>`}
        <button class="pick-x" data-act="part-del" data-i="${i}" aria-label="Retirer cette partie">×</button></div>
      <div class="part-amt"><input type="text" inputmode="decimal" class="part-amount" data-i="${i}" value="${esc(p.amountStr)}" placeholder="0,00" aria-label="Montant"><span>€</span>
        <span class="hint part-each" data-i="${i}">${n && amt ? `≈ ${money(Math.floor(amt/n))} chacun` : ""}</span></div>
      ${auto ? `<div class="part-auto" data-i="${i}"></div>`
      : `<span class="hint">Qui en a profité ?</span>
      <div class="pick-row">${mem.map(m => `<button class="pick${p.who[m.id]>0?" on":""}" data-act="part-who" data-i="${i}" data-mid="${m.id}" aria-pressed="${p.who[m.id]>0}">${avatar(m,"sm")}${esc(m.name)}</button>`).join("")}</div>`}
    </div>`; }).join("");
}
function drawPartWho(){
  const mem = membersOf(F.rid);
  document.querySelectorAll(".part-auto").forEach(box => {
    const p = F.parts[+box.dataset.i]; if(!p) return;
    const who = partWho(p, {split:F.split}, mem), list = mem.filter(m => who[m.id]);
    const noFlag = !mem.some(m => p.k==="alcool" ? m.diet?.noAlcohol : m.diet?.vege);
    box.innerHTML = `<span class="hint">Partagé entre ${list.length} personne${list.length>1?"s":""}, d'après l'onglet Membres :</span>
      <div class="faces">${list.map(m => avatar(m,"sm")).join("")}</div>
      ${noFlag ? `<span class="hint">${p.k==="alcool" ? "Personne n'est noté comme ne buvant pas d'alcool" : "Personne n'est noté végétarien"} : active les boutons 🥗 / 🍷 dans Membres pour affiner.</span>` : ""}`;
    const each = document.querySelector(`.part-each[data-i="${box.dataset.i}"]`), amt = parseAmount(p.amountStr);
    if(each) each.textContent = list.length && amt ? `≈ ${money(Math.floor(amt/list.length))} chacun` : "";
  });
}
function drawSplit(){
  const amount = parseAmount($("#f-amount")?.value||""), sh = expShares({amount, split:F.split, parts:formParts()}, membersOf(F.rid));
  drawPartWho();
  const isT = F.kind==="transfer";
  $("#f-split").innerHTML = membersOf(F.rid).map(m => { const w = F.split[m.id]||0;
    return `<div class="split-row ${w || sh[m.id] ? "" : "off"}">${avatar(m,"sm")}<span class="grow">${esc(m.name)}</span>
      <span class="share">${amount && sh[m.id] ? money(sh[m.id]) : "—"}</span>
      ${isT ? `<button class="pill-btn" data-act="t-to" data-mid="${m.id}" aria-pressed="${!!w}">${w?"✓":"Choisir"}</button>`
      : `<div class="stepper"><button data-act="w-" data-mid="${m.id}" aria-label="Une part de moins pour ${esc(m.name)}">−</button><span>${w}</span><button data-act="w+" data-mid="${m.id}" aria-label="Une part de plus pour ${esc(m.name)}">+</button></div>`}
    </div>`; }).join("");
}
async function saveExpense(){
  const amount = parseAmount($("#f-amount").value);
  if(!amount){ toast("Indique un montant."); return; }
  if(!F.paidBy){ toast("Choisis qui a payé."); return; }
  const split = {}; for(const [k,v] of Object.entries(F.split)) if(v>0) split[k]=v;
  const parts = [];
  for(const p of formParts()){
    if(!p.amount){ toast(`Indique le montant de « ${p.label||"Autre"} », ou retire cette ligne.`); return; }
    const part = {k:p.k, label:(p.label||"Autre").slice(0,24), amount:p.amount};
    if(p.k==="autre"){
      const who = {}; for(const [k,v] of Object.entries(p.who||{})) if(v>0) who[k]=1;
      if(!Object.keys(who).length){ toast(`Choisis qui a profité de « ${part.label} ».`); return; }
      part.who = who;
    }
    parts.push(part);
  }
  const extra = parts.reduce((s,p)=>s+p.amount,0);
  if(extra > amount){ toast("Les montants « dont » dépassent le total de la dépense."); return; }
  if(extra < amount && !Object.keys(split).length){ toast("Choisis pour qui est la dépense."); return; }
  const data = { kind:F.kind, title: F.kind==="transfer" ? "Remboursement" : ($("#f-title").value.trim() || "Dépense"),
    amount, paidBy:F.paidBy, split, date: $("#f-date").value || today(), createdAt: F.createdAt || Date.now() };
  if(parts.length) data.parts = parts;
  const {rid, eid} = F;
  const up = { [`rooms/${rid}/expenses/${eid || randomId(12)}`]: data };
  const ok = await write(() => update(R("/"), up), eid ? "Dépense modifiée" : "Dépense ajoutée");
  if(ok) closeSheet();
}

function sheetRoomSettings(rid){
  const r = S.rooms.get(rid); F = {type:"room-settings", rid, confirmDel:false};
  openSheet(`<div class="sheet-head"><h2>Réglages du groupe</h2>${closeBtn}</div>
    <div class="field"><label for="f-rname">Nom du groupe</label><input type="text" id="f-rname" maxlength="60" value="${esc(r.name)}"></div>
    <button class="btn block" data-act="room-rename">Enregistrer</button>
    <button class="btn ghost block" data-act="room-leave">Quitter le groupe</button>
    <span class="hint">Le groupe disparaît de tes groupes. Tu pourras le retrouver avec son lien d'invitation.</span>
    <button class="btn danger block" data-act="room-del">Supprimer le groupe pour tout le monde</button>
    <span class="hint">La suppression efface toutes les dépenses du groupe pour tous les participants.</span>`);
}

/* ---------- actions ---------- */
document.addEventListener("click", async ev => {
  const el = ev.target.closest("[data-act]"); if(!el) return;
  const a = el.dataset.act, rid = el.dataset.room || F?.rid || S.view.id;
  if(a==="close-scrim"){ if(ev.target===el) closeSheet(); return; }
  switch(a){
    case "close": closeSheet(); break;
    case "home": goHome(); break;
    case "open": goRoom(el.dataset.room); break;
    case "tab": S.tab=el.dataset.tab; render(); break;

    case "signup": sheetSignup(); break;
    case "signup-ok": doSignup(el); break;
    case "login-pick": sheetLogin(el.dataset.pid); break;
    case "login-ok": doLogin(el); break;
    case "my-profile": sheetMyProfile(); break;
    case "me-save": {
      const name = $("#f-name").value.trim(); if(!name){ toast("Indique ton prénom."); break; }
      if(await write(() => update(R(`profiles/${S.myPid}`), {name, photo:F.photo||null}), "Profil enregistré")) closeSheet();
      break; }
    case "me-pin": {
      const pin=$("#f-pin").value, pin2=$("#f-pin2").value;
      if(!PIN_RE.test(pin)){ toast("Le code doit faire 4 à 6 chiffres."); break; }
      if(pin!==pin2){ toast("Les deux codes ne sont pas identiques."); break; }
      const h = await pinHash(S.myPid, pin);
      if(await write(() => update(R("/"), {[`secrets/${S.myPid}`]:{pinHash:h}, [`devices/${S.uid}`]:{pid:S.myPid, proof:h}}), "Code changé")) closeSheet();
      break; }
    case "me-diet": {
      const f = el.dataset.f, val = !myProfile()?.diet?.[f];
      el.setAttribute("aria-checked", val); el.querySelector(".switch")?.classList.toggle("on", val);
      const up = {[`profiles/${S.myPid}/diet/${f}`]: val};
      /* on retire les réglages faits à la main sur moi dans mes groupes, pour que le profil s'applique partout */
      for(const rid of S.roomIds){ const me = (S.rooms.get(rid)?.members||[]).find(m => m.pid===S.myPid); if(me?.diet && f in me.diet) up[`rooms/${rid}/members/${me.id}/diet/${f}`] = null; }
      await write(() => update(R("/"), up), "Préférence enregistrée");
      break; }
    case "admin-reset": sheetAdminReset(el.dataset.pid); break;
    case "admin-reset-ok": {
      const pin = $("#f-newpin").value.trim();
      if(!PIN_RE.test(pin)){ toast("Le code doit faire 4 à 6 chiffres."); break; }
      const h = await pinHash(F.pid, pin), name = S.profiles.get(F.pid)?.name;
      if(await write(() => set(R(`secrets/${F.pid}`), {pinHash:h}), `Nouveau code enregistré pour ${name}`)) closeSheet();
      break; }
    case "skin": {
      applySkin(el.dataset.skin);
      if(S.myPid) update(R(`profiles/${S.myPid}`), {skin: el.dataset.skin}).catch(()=>{});
      document.querySelectorAll(".skin-opt").forEach(b => { const on = b.dataset.skin===el.dataset.skin; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
      break; }
    case "chrono": chToggle(); break;
    case "chrono-reset": chReset(); break;
    case "claim-open": S.claimOpen = {...(S.claimOpen||{}), [rid]:true}; render(); break;
    case "logout": {
      closeSheet();
      await write(() => remove(R(`devices/${S.uid}`)), "Déconnecté de cet appareil");
      break; }

    case "new-room": sheetNewRoom(); break;
    case "pick-friend": {
      const pid = el.dataset.pid, on = !F.picked.has(pid);
      on ? F.picked.add(pid) : F.picked.delete(pid);
      el.classList.toggle("on", on); el.setAttribute("aria-pressed", on);
      break; }
    case "room-add-other": addOther(); break;
    case "room-rm-other": F.others.splice(+el.dataset.i,1); drawOthers(); break;
    case "room-create": createRoom(el); break;
    case "invite": sheetInvite(rid, false); break;
    case "copy-room-link":
      try{ await navigator.clipboard.writeText(shareLink(rid)); el.textContent = "Copié ✓"; toast("Lien copié : colle-le dans WhatsApp ou par SMS"); setTimeout(()=>{ el.textContent = "Copier"; }, 2000); }
      catch{ sheetInvite(rid, false); }
      break;
    case "copy-link": {
      const i = $("#f-link");
      try{ await navigator.clipboard.writeText(i.value); toast("Lien copié"); }
      catch{ i.select(); toast("Sélectionne le lien et copie-le"); }
      break; }
    case "native-share":
      try{ await navigator.share({title:`Ardoise · ${F.title}`, text:`Rejoins le groupe « ${F.title} » sur Ardoise pour partager les dépenses :`, url:$("#f-link").value}); }catch{}
      break;
    case "forget": {
      const r = el.dataset.room;
      await write(() => remove(R(`profiles/${S.myPid}/rooms/${r}`)));
      unwatchRoom(r); goHome(); break; }

    case "claim": await linkMember(rid, el.dataset.mid, S.myPid, `Bonjour ${myProfile()?.name||""} !`); break;
    case "claim-new": {
      const mid = randomId(10);
      await write(() => update(R("/"), {
        [`rooms/${rid}/members/${mid}`]: {pid:S.myPid, name:myProfile()?.name||"", createdAt:Date.now()},
        [`rooms/${rid}/access/${S.myPid}`]: true, [`profiles/${S.myPid}/rooms/${rid}`]: true,
      }), "Tu fais partie du groupe");
      break; }
    case "claim-here": { const {rid:r, mid} = F; closeSheet(); await linkMember(r, mid, S.myPid, `Bonjour ${myProfile()?.name||""} !`); break; }
    case "link-profile": {
      const {rid:r, mid} = F, pid = el.dataset.pid;
      if(await linkMember(r, mid, pid, `Relié au profil de ${S.profiles.get(pid)?.name||""}`)) closeSheet();
      break; }
    case "unclaim": {
      const {rid:r, mid} = F; closeSheet();
      await write(() => update(R(`rooms/${r}/members/${mid}`), {pid:null, name:myProfile()?.name||""}), "C'est noté");
      break; }
    case "add-member": sheetAddMembers(rid); break;
    case "add-members-ok": addMembers(el); break;
    case "edit-member": sheetMember(rid, el.dataset.mid); break;
    case "pick-photo": $("#photoInput").click(); break;
    case "rm-photo": F.photo=null; refreshPhoto(); el.remove(); break;
    case "member-save": {
      const name=$("#f-name").value.trim(); if(!name){ toast("Indique un prénom."); break; }
      const {rid:r, mid, photo} = F;
      if(await write(() => update(R(`rooms/${r}/members/${mid}`), {name, photo: photo||null}), "Enregistré")) closeSheet();
      break; }
    case "member-del":
      if(!F.confirmDel){ F.confirmDel=true; el.textContent="Confirmer"; break; }
      { const {rid:r, mid} = F, m = member(r, mid);
        const up = {[`rooms/${r}/members/${mid}`]: null};
        if(m.pid){ up[`rooms/${r}/access/${m.pid}`] = null; up[`profiles/${m.pid}/rooms/${r}`] = null; }
        if(await write(()=>update(R("/"), up), "Personne retirée")) closeSheet(); }
      break;

    case "add-exp": sheetExpense(rid, null); break;
    case "edit-exp": if(!S.rooms.get(rid)?.closed) sheetExpense(rid, el.dataset.eid); break;
    case "payer": F.paidBy=el.dataset.mid; drawPayer(); break;
    case "w+": F.split[el.dataset.mid]=Math.min(20,(F.split[el.dataset.mid]||0)+1); drawSplit(); break;
    case "w-": F.split[el.dataset.mid]=Math.max(0,(F.split[el.dataset.mid]||0)-1); drawSplit(); break;
    case "t-to": for(const k in F.split) F.split[k]=0; F.split[el.dataset.mid]=1; drawSplit(); break;
    case "split-all": for(const m of membersOf(F.rid)) F.split[m.id]=Math.max(1,F.split[m.id]||0); drawSplit(); break;
    case "split-none": for(const k in F.split) F.split[k]=0; drawSplit(); break;
    case "exp-save": saveExpense(); break;
    case "part-add": {
      const kind = PART_KINDS.find(p => p.k===el.dataset.k) || PART_KINDS[3];
      const who = {};
      if(kind.k==="autre") membersOf(F.rid).filter(m => (F.split[m.id]||0) > 0).forEach(m => who[m.id] = 1);
      F.parts.push({k:kind.k, label: kind.k==="autre" ? "" : kind.label, amountStr:"", who});
      drawParts(); drawSplit();
      setTimeout(() => { const ins = document.querySelectorAll(".part-amount"); ins[ins.length-1]?.focus(); }, 30);
      break; }
    case "diet": {
      const r = rid, mid = el.dataset.mid, f = el.dataset.f, m = member(r, mid);
      const val = !m.diet?.[f];
      await write(() => update(R(`rooms/${r}/members/${mid}/diet`), {[f]: val}),
        f==="vege" ? (val ? `${m.name} est noté·e végétarien·ne` : `${m.name} n'est plus noté·e végétarien·ne`)
                   : (val ? `${m.name} ne boit pas d'alcool` : `${m.name} boit de l'alcool`));
      break; }
    case "part-del": F.parts.splice(+el.dataset.i, 1); drawParts(); drawSplit(); break;
    case "part-who": {
      const p = F.parts[+el.dataset.i], mid = el.dataset.mid;
      p.who[mid] = p.who[mid] > 0 ? 0 : 1;
      drawParts(); drawSplit(); break; }
    case "exp-del":
      if(!F.confirmDel){ F.confirmDel=true; el.textContent="Confirmer la suppression"; break; }
      { const {rid:r, eid} = F; if(await write(()=>remove(R(`rooms/${r}/expenses/${eid}`)), "Dépense supprimée")) closeSheet(); }
      break;
    case "settle": {
      const r=el.dataset.room, from=member(r,el.dataset.from), to=member(r,el.dataset.to), amount=+el.dataset.amount;
      F = {type:"settle", rid:r, from:from.id, to:to.id, amount};
      openSheet(`<div class="sheet-head"><h2>Confirmer le remboursement ?</h2></div>
        <div class="row settle" style="background:var(--surface)"><div class="names">${avatar(from)}<b>${esc(from.name)}</b><span class="arrow">${ICON.arrow}</span>${avatar(to)}<b>${esc(to.name)}</b></div></div>
        <div class="big num" style="color:var(--ink);text-align:center">${money(amount)}</div>
        <p class="hint" style="margin:0;text-align:center">Es-tu sûr que ${esc(from.name)} a bien remboursé ${esc(to.name)} ? Le remboursement sera enregistré dans les dépenses du groupe.</p>
        <div class="two"><button class="btn ghost" data-act="close">Annuler</button><button class="btn" data-act="settle-ok">Oui, c'est réglé</button></div>`);
      break; }
    case "settle-ok": {
      const {rid:r, from, to, amount} = F; el.disabled = true;
      if(await write(()=>set(R(`rooms/${r}/expenses/${randomId(12)}`), {kind:"transfer", title:"Remboursement", amount, paidBy:from, split:{[to]:1}, date:today(), createdAt:Date.now()}),
        `${member(r,from).name} → ${member(r,to).name} : ${money(amount)} réglé`)) closeSheet(); else el.disabled=false;
      break; }
    case "room-close-ask": {
      const r = rid, left = settle(balances(r)).reduce((s,t)=>s+t.amount,0);
      F = {type:"close", rid:r};
      openSheet(`<div class="sheet-head"><h2>Clôturer « ${esc(S.rooms.get(r)?.name)} » ?</h2></div>
        ${left ? `<div class="notice err">Attention : il reste ${money(left)} à rembourser dans ce groupe. Les remboursements resteront visibles et pourront encore être réglés.</div>`
               : `<div class="notice" style="background:var(--owed-soft);color:var(--owed);font-weight:600">🎉 Tout le monde est à jour, parfait pour clôturer.</div>`}
        <p class="hint" style="margin:0">Une fois clôturé, le groupe passe dans « Groupes clôturés » et on ne peut plus y ajouter ni modifier de dépenses. Tu pourras le rouvrir à tout moment.</p>
        <div class="two"><button class="btn ghost" data-act="close">Annuler</button><button class="btn" data-act="room-close-ok">Clôturer</button></div>`);
      break; }
    case "room-close-ok": { const r=F.rid; el.disabled=true; if(await write(()=>update(R(`rooms/${r}/info`),{closed:true, closedAt:Date.now()}), "Groupe clôturé")) closeSheet(); else el.disabled=false; break; }
    case "room-reopen": await write(()=>update(R(`rooms/${rid}/info`),{closed:false}), "Groupe rouvert"); break;
    case "room-settings": sheetRoomSettings(rid); break;
    case "room-rename": { const n=$("#f-rname").value.trim(); if(!n){ toast("Donne un nom au groupe."); break; } if(await write(()=>update(R(`rooms/${F.rid}/info`),{name:n}), "Nom enregistré")) closeSheet(); break; }
    case "room-leave": {
      const r=F.rid, me = meIn(r); closeSheet();
      const up = {[`profiles/${S.myPid}/rooms/${r}`]: null};
      if(me) up[`rooms/${r}/members/${me.id}/pid`] = null;
      up[`rooms/${r}/access/${S.myPid}`] = null;
      if(await write(() => update(R("/"), up), "Tu as quitté le groupe")){ unwatchRoom(r); goHome(); }
      break; }
    case "room-del":
      if(!F.confirmDel){ F.confirmDel=true; el.textContent="Confirmer : tout supprimer"; break; }
      { const r=F.rid; el.disabled=true;
        const pids = Object.keys((await get(R(`rooms/${r}/access`)).catch(()=>null))?.val?.() || {});
        const up = {[`rooms/${r}`]: null}; pids.forEach(pid => { up[`profiles/${pid}/rooms/${r}`] = null; });
        if(await write(()=>update(R("/"), up), "Groupe supprimé")){ closeSheet(); unwatchRoom(r); goHome(); } }
      break;
  }
});

$("#photoInput").addEventListener("change", async e => {
  const f = e.target.files?.[0]; e.target.value = "";
  if(!f || !F || !["member","me","signup"].includes(F.type)) return;
  try{ F.photo = await fileToAvatar(f); refreshPhoto(); }
  catch{ toast("Cette image ne peut pas être lue. Essaie un JPG ou un PNG."); }
});
document.addEventListener("keydown", e => { if(e.key==="Escape" && F) closeSheet(); });
document.addEventListener("input", e => {
  if(!F || F.type!=="expense") return;
  const t = e.target, i = +t.dataset.i;
  if(t.classList.contains("part-amount")){
    F.parts[i].amountStr = t.value;
    const p = F.parts[i], n = Object.values(p.who).filter(w=>w>0).length, amt = parseAmount(p.amountStr);
    const each = document.querySelector(`.part-each[data-i="${i}"]`); if(each) each.textContent = n && amt ? `≈ ${money(Math.floor(amt/n))} chacun` : "";
    drawSplit();
  } else if(t.classList.contains("part-label")) F.parts[i].label = t.value;
});
document.addEventListener("change", e => {
  if(e.target.id !== "f-skin") return;
  const id = e.target.value, k = SKINS.find(s => s.id===id);
  applySkin(id);
  const dot = $("#f-skin-dot"); if(dot && k){ dot.style.background = k.bg; dot.style.color = k.fg; }
  if(S.myPid) update(R(`profiles/${S.myPid}`), {skin:id}).catch(()=>{});
});
window.addEventListener("hashchange", route);
window.addEventListener("popstate", route);

/* ---------- démarrage ---------- */
let unsubDevice = null;
async function boot(){
  const cfg = await loadFirebaseConfig();
  if(!cfg.apiKey){ S.error = "Configuration Firebase incomplète : ajoute une application Web dans les paramètres du projet Firebase."; render(); return; }
  const app = initializeApp(cfg);
  S.db = getDatabase(app);
  const auth = getAuth(app);
  onValue(R(".info/connected"), s => { const was = S.online; S.online = !!s.val(); if(S.online) S.slow = false; if(was!==S.online && S.myPid) render(); });
  setTimeout(() => { if(S.myPid===undefined || !S.profilesReady){ S.slow = true; render(); } }, 10000);

  onAuthStateChanged(auth, user => {
    if(!user){
      signInAnonymously(auth).catch(e => {
        console.error(e);
        S.error = e?.code==="auth/operation-not-allowed" || e?.code==="auth/admin-restricted-operation"
          ? "La connexion « Anonyme » n'est pas activée dans Firebase (Authentication → Méthode de connexion)."
          : "Connexion impossible pour l'instant. Vérifie ta connexion internet puis recharge la page.";
        render();
      });
      return;
    }
    S.uid = user.uid;
    startProfileWatches();
    unsubDevice?.();
    unsubDevice = onValue(R(`devices/${user.uid}`), async snap => {
      const pid = snap.val()?.pid || null;
      const changed = pid !== S.myPid;
      S.myPid = pid;
      if(changed){
        for(const id of Object.keys(S.subs)) unwatchRoom(id);
        S.roomIdsReady = false; startMyRooms();
        const want = pid && S.profiles.get(pid)?.skin;
        if(want && want !== currentSkin()) applySkin(want);
        if(pid){
          await migrateLocal();
          if(S.pendingJoin){ const h = S.pendingJoin; S.pendingJoin = null; location.hash = h; route(); return; }
          closeSheet();
        }
      }
      route();
    }, err => { console.error(err); S.error = "La base refuse l'accès. Les règles de sécurité ne sont peut-être pas encore à jour."; render(); });
  });
}
render();
chSync();
boot().catch(e => { console.error(e); S.error = "Impossible de démarrer Ardoise. Recharge la page."; render(); });
