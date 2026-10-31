import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, set, update, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
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
const plusSm = ICON.plus.replace("<svg",'<svg width="18" height="18"');

/* ---------- appareil : mes groupes et qui je suis ---------- */
const LS = {
  get(k,d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch{ return d; } },
  set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} }
};
let myRooms = LS.get("ardoise.rooms", []);
let myIds = LS.get("ardoise.me", {});
const saveLocal = () => { LS.set("ardoise.rooms", myRooms); LS.set("ardoise.me", myIds); };
const ID_RE = /^[A-Za-z0-9]{20,40}$/;
function randomId(n=22){
  const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", b = new Uint8Array(n);
  crypto.getRandomValues(b); return [...b].map(x => a[x % 62]).join("");
}

/* ---------- état ---------- */
const S = { db:null, online:true, slow:false, error:null, rooms:new Map(), loaded:new Set(), subs:{}, view:{name:"home"}, tab:"depenses" };
let F = null;

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
function balances(rid){
  const bal = {}; for(const m of membersOf(rid)) bal[m.id] = 0;
  for(const e of expensesOf(rid)){
    bal[e.paidBy] = (bal[e.paidBy]||0) + e.amount;
    for(const [m,c] of Object.entries(shares(e.amount, e.split))) bal[m] = (bal[m]||0) - c;
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
const membersOf = rid => S.rooms.get(rid)?.members || [];
const expensesOf = rid => S.rooms.get(rid)?.expenses || [];
const member = (rid, mid) => membersOf(rid).find(m => m.id===mid) || {id:mid, name:"Ancien membre"};
const meIn = rid => membersOf(rid).find(m => m.id===myIds[rid]) || null;
const roomsSorted = () => myRooms.map(id => S.rooms.get(id)).filter(r => r && !r.missing).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
const shareLink = rid => `${location.origin}${location.pathname}#${rid}`;

function hue(s){ let h=0; for(const ch of String(s)) h=(h*31+ch.charCodeAt(0))>>>0; return h%360; }
function avatar(m, size=""){
  const ok = typeof m.photo==="string" && m.photo.startsWith("data:image/");
  const init = esc((m.name||"?").trim().slice(0,1).toUpperCase());
  return `<span class="av ${size}" style="background:hsl(${hue(m.id+m.name)} 45% 46%)" title="${esc(m.name)}">${ok?`<img alt="" src="${m.photo}">`:init}</span>`;
}
function chip(c){ if(c<0) return `<span class="chip owe">tu dois ${money(-c)}</span>`; if(c>0) return `<span class="chip owed">on te doit ${money(c)}</span>`; return `<span class="chip owed">✓ bravo, rien à régler</span>`; }
const CONGRATS = ["Bravo, tu es à jour !","Comptes nickel, bien joué !","Rien à rembourser, chapeau !","Ardoise effacée, bravo !"];
const congrats = seed => CONGRATS[hue(seed||"x") % CONGRATS.length];

function toast(msg){ const t=$("#toastRoot"); t.innerHTML=`<div class="toast" role="status">${esc(msg)}</div>`; clearTimeout(toast.t); toast.t=setTimeout(()=>t.innerHTML="",2600); }
async function write(fn, okMsg){
  try{ await fn(); if(okMsg) toast(okMsg); return true; }
  catch(e){
    console.error(e);
    toast(String(e?.code||e?.message||"").includes("PERMISSION") ? "La base refuse l'enregistrement : vérifie les règles Firebase." : "Enregistrement impossible pour l'instant. Réessaie dans un moment.");
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
  }, err => { console.error(err); S.loaded.add(rid); S.error = "La base Firebase refuse la lecture : vérifie les règles de la base."; render(); });
}
function unwatchRoom(rid){ S.subs[rid]?.(); delete S.subs[rid]; S.rooms.delete(rid); S.loaded.delete(rid); }
function joinRoom(rid){ if(!myRooms.includes(rid)){ myRooms.push(rid); saveLocal(); } watchRoom(rid); }
function leaveRoom(rid){ myRooms = myRooms.filter(x => x!==rid); delete myIds[rid]; saveLocal(); unwatchRoom(rid); }

/* ---------- navigation ---------- */
function route(){
  const h = decodeURIComponent(location.hash.slice(1));
  if(ID_RE.test(h)){
    const isNew = !myRooms.includes(h);
    joinRoom(h);
    if(S.view.name!=="room" || S.view.id!==h){ S.view = {name:"room", id:h}; S.tab = myIds[h] ? "depenses" : "membres"; if(isNew) S.tab = "depenses"; window.scrollTo(0,0); }
  } else S.view = {name:"home"};
  closeSheet(); render();
}
const goHome = () => { history.pushState("", "", location.pathname + location.search); route(); };
const goRoom = rid => { location.hash = rid; };

/* ---------- vues ---------- */
function render(){
  const app = $("#app");
  const waiting = myRooms.some(id => !S.loaded.has(id));
  if(S.error){ app.innerHTML = `<div class="top"><div class="brand">Ardoise<span>.</span></div></div><div class="notice err">${esc(S.error)}</div>`; $("#fab")?.remove(); return; }
  if(S.view.name==="room"){
    const r = S.rooms.get(S.view.id);
    if(!r){ app.innerHTML = loadingHTML("Ouverture du groupe…"); $("#fab")?.remove(); return; }
    if(r.missing){ renderMissing(r.id); return; }
    renderRoom(r.id); return;
  }
  if(waiting && !roomsSorted().length){ app.innerHTML = loadingHTML("Chargement de tes groupes…"); $("#fab")?.remove(); return; }
  renderHome();
}
function loadingHTML(msg){
  return `<div class="top"><div class="brand">Ardoise<span>.</span></div></div>
    <div class="slate"><span class="label">Ton solde</span><div class="big zero">…</div>
    <div class="sub">${S.slow ? "La base de données ne répond pas. Vérifie ta connexion internet." : msg}</div></div>`;
}
function renderMissing(rid){
  $("#fab")?.remove();
  $("#app").innerHTML = `<div class="top"><button class="icon-btn" data-act="home" aria-label="Retour aux groupes">${ICON.back}</button><div class="grow room-title">Groupe introuvable</div></div>
    <div class="empty"><b>Ce groupe n'existe pas ou a été supprimé</b><span class="muted">Vérifie le lien qu'on t'a envoyé.</span>
    <button class="btn ghost" data-act="forget" data-room="${rid}">Retirer de mes groupes</button></div>`;
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

  $("#app").innerHTML = `
  <div class="top"><div class="brand grow">Ardoise<span>.</span></div></div>
  ${S.online ? "" : `<div class="notice">Hors ligne : tes modifications seront envoyées au retour de la connexion.</div>`}
  <section class="slate" aria-label="Ton solde">
    <span class="label">${owe ? "Tu dois au total" : owed ? "On te doit au total" : "Ton solde"}</span>
    <div class="big ${owe?"owe":owed?"owed":allGood?"owed":"zero"}">${allGood ? esc(congrats(myRooms.join(""))) : money(owe||owed)}</div>
    <div class="sub">${owe && owed ? `Et on te doit <b class="num">${money(owed)}</b> de ton côté.` :
      noMe ? "Ouvre un groupe et indique qui tu es pour voir ton solde." :
      allGood ? "Tu ne dois rien à personne et personne ne te doit rien. Merci d'être réglo !" :
      !rooms.length ? "Crée un groupe, ou ouvre le lien qu'un ami t'a envoyé." : ""}</div>
    ${mine.length ? `<div class="stack">${mine.map(t => {
      const other = member(t.room.id, t.dir==="owe" ? t.to : t.from);
      return `<div class="debt">${avatar(other)}
        <div class="who"><b>${t.dir==="owe" ? "À " : "De "}${esc(other.name)}</b><small>${esc(t.room.name)}</small></div>
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
  if(!me && mem.length){
    meBlock = `<div class="claim"><b>Qui es-tu dans ce groupe ?</b><span class="hint">Choisis ton profil pour voir ce que tu dois. Ce choix reste sur ce téléphone.</span>
      <div class="pick-row">${mem.map(m=>`<button class="pick" data-act="claim" data-mid="${m.id}">${avatar(m,"sm")}${esc(m.name)}</button>`).join("")}</div>
      ${editable ? `<span class="hint">Tu n'es pas dans la liste ? Ajoute-toi dans l'onglet Membres.</span>` : ""}</div>`;
  } else if(me){
    meBlock = `<div class="me-card">
      <div class="me-line">${avatar(me,"lg")}<div class="grow"><span class="label">${myB<0?"Tu dois":myB>0?"On te doit":"Ton solde"}</span>
        <div class="me-amt ${myB<0?"owe":"owed"}">${myB ? money(Math.abs(myB)) : esc(congrats(rid+me.id))}</div>
        ${myB ? "" : `<span class="hint">Tu ne dois rien et on ne te doit rien dans ce groupe. Merci d'être réglo !</span>`}</div></div>
      ${mineT.map(t => { const o = member(rid, t.from===me.id ? t.to : t.from), out = t.from===me.id;
        return `<div class="row" style="background:var(--surface-2)">${avatar(o,"sm")}<div class="grow"><div class="t">${out?"Rembourser ":"Attendre "}${esc(o.name)}</div></div>
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
        const p = member(rid, e.paidBy), sh = shares(e.amount, e.split), myShare = me ? (sh[me.id]||0) : 0;
        const parts = Object.values(e.split||{}).reduce((s,w)=>s+(w>0?w:0),0);
        if(e.kind==="transfer"){
          const to = member(rid, Object.keys(e.split||{})[0]);
          body += `<button class="row transfer" data-act="edit-exp" data-eid="${e.id}">${avatar(p,"sm")}<span class="arrow">${ICON.arrow}</span>${avatar(to,"sm")}
            <div class="grow"><div class="t">Remboursement</div><div class="s">${esc(p.name)} → ${esc(to.name)}</div></div><div class="r"><b>${money(e.amount)}</b></div></button>`;
        } else {
          body += `<button class="row" data-act="edit-exp" data-eid="${e.id}">${avatar(p)}
            <div class="grow"><div class="t">${esc(e.title||"Dépense")}</div><div class="s">${esc(p.name)} a payé · ${parts} part${parts>1?"s":""}</div></div>
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
      : `<div class="notice" style="background:var(--owed-soft);color:var(--owed);font-weight:600">🎉 Bravo à tous, tout le monde est à jour !
          ${editable && exps.length ? `<div style="margin-top:10px"><button class="btn" data-act="room-close-ask">Clôturer le groupe</button></div>` : ""}</div>`;
    body += `<p class="hint" style="margin:0 4px">Le nombre de remboursements est réduit au minimum. « Réglé » enregistre le paiement dans les dépenses.</p>`;
  } else {
    body = mem.map(m => `<button class="row" data-act="edit-member" data-mid="${m.id}">${avatar(m)}<div class="grow"><div class="t">${esc(m.name)}</div>
      <div class="s">${m.id===me?.id ? "C'est toi" : "&nbsp;"}</div></div><span class="muted" style="font-size:.85rem">Modifier</span></button>`).join("")
      + (editable ? `<button class="btn ghost block" data-act="add-member">${plusSm} Ajouter une personne</button>` : "");
  }

  document.body.classList.toggle("room-closed", !!r.closed);
  $("#app").innerHTML = `
    <div class="top"><button class="icon-btn" data-act="home" aria-label="Retour aux groupes">${ICON.back}</button>
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
    <div class="tabs" role="tablist">
      ${[["depenses","Dépenses"],["equilibres","Équilibres"],["membres","Membres"]].map(([k,l])=>`<button role="tab" aria-selected="${S.tab===k}" data-act="tab" data-tab="${k}">${l}</button>`).join("")}
    </div>
    <div class="list">${body}</div>`;

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
  setTimeout(()=>$(".sheet input[type=text]")?.focus({preventScroll:true}), 60);
}
function closeSheet(){ $("#sheetRoot").innerHTML=""; F=null; }

function sheetNewRoom(){
  F = {type:"room", others:[]};
  openSheet(`<div class="sheet-head"><h2>Nouveau groupe</h2><button class="pill-btn" data-act="close">Fermer</button></div>
    <div class="field"><label for="f-room">Nom de l'événement</label><input type="text" id="f-room" maxlength="60" placeholder="Week-end à Annecy"></div>
    <div class="field"><label for="f-me">Ton prénom</label><input type="text" id="f-me" maxlength="40" placeholder="Ton prénom"></div>
    <div class="field"><label for="f-other">Les autres participants</label>
      <div style="display:flex;gap:8px"><input type="text" id="f-other" maxlength="40" placeholder="Prénom" style="flex:1"><button class="btn ghost" data-act="room-add-other">Ajouter</button></div>
      <div class="chips" id="f-others"></div>
      <span class="hint">Tu pourras ajouter des photos et d'autres personnes ensuite, puis envoyer le lien du groupe à tes amis.</span></div>
    <button class="btn block" data-act="room-create">Créer le groupe</button>`);
  $("#f-other").addEventListener("keydown", e => { if(e.key==="Enter"){ e.preventDefault(); addOther(); } });
}
function addOther(){ const i=$("#f-other"); const v=i.value.trim(); if(!v) return; F.others.push(v); i.value=""; i.focus(); drawOthers(); }
function drawOthers(){ $("#f-others").innerHTML = F.others.map((n,i)=>`<span class="tag">${esc(n)}<button data-act="room-rm-other" data-i="${i}" aria-label="Retirer ${esc(n)}">×</button></span>`).join(""); }

async function createRoom(){
  const name=$("#f-room").value.trim(), meName=$("#f-me").value.trim();
  const pending=$("#f-other").value.trim(); if(pending) F.others.push(pending);
  if(!name){ toast("Donne un nom au groupe."); return; }
  if(!meName){ toast("Indique ton prénom."); return; }
  const btn = $("[data-act=room-create]"); btn.disabled = true;
  const rid = randomId(22), now = Date.now(), members = {}, meId = randomId(10);
  members[meId] = {name:meName, createdAt:now};
  F.others.forEach((o,k) => { members[randomId(10)] = {name:o, createdAt:now+k+1}; });
  const ok = await write(() => set(R(`rooms/${rid}`), {info:{name, createdAt:now, closed:false}, members}), "Groupe créé");
  if(ok){ myIds[rid] = meId; joinRoom(rid); closeSheet(); goRoom(rid); setTimeout(()=>sheetInvite(rid, true), 300); }
  else btn.disabled = false;
}

function sheetInvite(rid, fresh){
  const link = shareLink(rid), r = S.rooms.get(rid);
  F = {type:"invite", rid};
  openSheet(`<div class="sheet-head"><h2>${fresh ? "Groupe créé, invite tes amis" : "Inviter des amis"}</h2><button class="pill-btn" data-act="close">Fermer</button></div>
    <p class="hint" style="margin:0">Envoie ce lien sur WhatsApp, Messenger ou par SMS. Toute personne qui a le lien peut voir et modifier le groupe, alors partage-le seulement avec les participants.</p>
    <div class="field"><label for="f-link">Lien du groupe</label><input type="text" id="f-link" readonly value="${esc(link)}"></div>
    <div class="two"><button class="btn ghost" data-act="copy-link">Copier le lien</button>
      ${navigator.share ? `<button class="btn" data-act="native-share">Partager…</button>` : `<button class="btn" data-act="close">OK</button>`}</div>`);
  F.title = r?.name || "Ardoise";
}

function sheetMember(rid, mid){
  const m = mid ? member(rid, mid) : null, me = meIn(rid);
  F = {type:"member", rid, mid, photo: m?.photo || null, confirmDel:false};
  const used = mid && expensesOf(rid).some(e => e.paidBy===mid || (e.split && e.split[mid]>0));
  openSheet(`<div class="sheet-head"><h2>${m ? "Modifier le profil" : "Ajouter une personne"}</h2><button class="pill-btn" data-act="close">Fermer</button></div>
    <div class="photo-pick"><span id="f-av">${avatar({id:mid||"new", name:m?.name||"?", photo:F.photo},"xl")}</span>
      <div class="inline-actions"><button class="btn ghost" data-act="pick-photo">${F.photo?"Changer la photo":"Ajouter une photo"}</button>
      ${F.photo?`<button class="btn ghost" data-act="rm-photo">Retirer</button>`:""}</div></div>
    <div class="field"><label for="f-name">Prénom ou surnom</label><input type="text" id="f-name" maxlength="40" value="${esc(m?.name||"")}" placeholder="Prénom"></div>
    ${m ? (m.id===me?.id ? `<button class="btn ghost block" data-act="unclaim">Ce n'est pas moi</button>` : `<button class="btn ghost block" data-act="claim-here">C'est moi</button>`) : ""}
    <button class="btn block" data-act="member-save">${m ? "Enregistrer" : "Ajouter"}</button>
    ${m ? (used ? `<p class="hint" style="margin:0">Cette personne apparaît dans des dépenses : retire-la d'abord de ces dépenses pour pouvoir la supprimer.</p>`
      : `<button class="btn danger block" data-act="member-del">Supprimer ${esc(m.name)}</button>`) : ""}`);
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

async function saveMember(){
  const name=$("#f-name").value.trim(); if(!name){ toast("Indique un prénom."); return; }
  const {rid, mid, photo} = F;
  const ok = await write(() => mid
    ? update(R(`rooms/${rid}/members/${mid}`), {name, photo: photo||null})
    : set(R(`rooms/${rid}/members/${randomId(10)}`), {name, photo:photo||null, createdAt:Date.now()}),
    mid ? "Profil enregistré" : `${name} ajouté·e`);
  if(ok) closeSheet();
}
function claim(rid, mid){ myIds[rid] = mid; saveLocal(); S.tab = "depenses"; render(); toast(`Bonjour ${member(rid, mid).name} !`); }

function sheetExpense(rid, eid){
  const e = eid ? expensesOf(rid).find(x=>x.id===eid) : null, me = meIn(rid), mem = membersOf(rid);
  const split = {}; for(const m of mem) split[m.id] = e ? (e.split?.[m.id]||0) : 1;
  F = {type:"expense", rid, eid, kind:e?.kind||"expense", paidBy: e?.paidBy || me?.id || mem[0]?.id, split, confirmDel:false, createdAt:e?.createdAt};
  const isT = F.kind==="transfer";
  openSheet(`<div class="sheet-head"><h2>${isT ? "Remboursement" : e ? "Modifier la dépense" : "Nouvelle dépense"}</h2><button class="pill-btn" data-act="close">Fermer</button></div>
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
    <button class="btn block" data-act="exp-save">${e ? "Enregistrer" : "Ajouter la dépense"}</button>
    ${e ? `<button class="btn danger block" data-act="exp-del">Supprimer</button>` : ""}`);
  drawPayer(); drawSplit();
  $("#f-amount").addEventListener("input", drawSplit);
}
function drawPayer(){
  $("#f-payer").innerHTML = membersOf(F.rid).map(m => `<button class="pick ${m.id===F.paidBy?"on":""}" data-act="payer" data-mid="${m.id}" aria-pressed="${m.id===F.paidBy}">${avatar(m,"sm")}${esc(m.name)}</button>`).join("");
}
function drawSplit(){
  const amount = parseAmount($("#f-amount")?.value||""), sh = shares(amount, F.split);
  const isT = F.kind==="transfer";
  $("#f-split").innerHTML = membersOf(F.rid).map(m => { const w = F.split[m.id]||0;
    return `<div class="split-row ${w?"":"off"}">${avatar(m,"sm")}<span class="grow">${esc(m.name)}</span>
      <span class="share">${w && amount ? money(sh[m.id]||0) : "—"}</span>
      ${isT ? `<button class="pill-btn" data-act="t-to" data-mid="${m.id}" aria-pressed="${!!w}">${w?"✓":"Choisir"}</button>`
      : `<div class="stepper"><button data-act="w-" data-mid="${m.id}" aria-label="Une part de moins pour ${esc(m.name)}">−</button><span>${w}</span><button data-act="w+" data-mid="${m.id}" aria-label="Une part de plus pour ${esc(m.name)}">+</button></div>`}
    </div>`; }).join("");
}
async function saveExpense(){
  const amount = parseAmount($("#f-amount").value);
  if(!amount){ toast("Indique un montant."); return; }
  if(!F.paidBy){ toast("Choisis qui a payé."); return; }
  const split = {}; for(const [k,v] of Object.entries(F.split)) if(v>0) split[k]=v;
  if(!Object.keys(split).length){ toast("Choisis pour qui est la dépense."); return; }
  const data = { kind:F.kind, title: F.kind==="transfer" ? "Remboursement" : ($("#f-title").value.trim() || "Dépense"),
    amount, paidBy:F.paidBy, split, date: $("#f-date").value || today(), createdAt: F.createdAt || Date.now() };
  const {rid, eid} = F;
  const ok = await write(() => set(R(`rooms/${rid}/expenses/${eid || randomId(12)}`), data), eid ? "Dépense modifiée" : "Dépense ajoutée");
  if(ok) closeSheet();
}

function sheetRoomSettings(rid){
  const r = S.rooms.get(rid); F = {type:"room-settings", rid, confirmDel:false};
  openSheet(`<div class="sheet-head"><h2>Réglages du groupe</h2><button class="pill-btn" data-act="close">Fermer</button></div>
    <div class="field"><label for="f-rname">Nom du groupe</label><input type="text" id="f-rname" maxlength="60" value="${esc(r.name)}"></div>
    <button class="btn block" data-act="room-rename">Enregistrer</button>
    <button class="btn ghost block" data-act="room-leave">Retirer de mes groupes</button>
    <span class="hint">Le groupe disparaît seulement de ton téléphone. Tu pourras le retrouver avec son lien.</span>
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
    case "new-room": sheetNewRoom(); break;
    case "room-add-other": addOther(); break;
    case "room-rm-other": F.others.splice(+el.dataset.i,1); drawOthers(); break;
    case "room-create": createRoom(); break;
    case "invite": sheetInvite(rid, false); break;
    case "copy-link": {
      const i = $("#f-link");
      try{ await navigator.clipboard.writeText(i.value); toast("Lien copié"); }
      catch{ i.select(); toast("Sélectionne le lien et copie-le"); }
      break; }
    case "native-share":
      try{ await navigator.share({title:`Ardoise · ${F.title}`, text:`Rejoins le groupe « ${F.title} » sur Ardoise pour partager les dépenses :`, url:$("#f-link").value}); }catch{}
      break;
    case "forget": leaveRoom(el.dataset.room); goHome(); break;
    case "claim": claim(rid, el.dataset.mid); break;
    case "add-member": sheetMember(rid, null); break;
    case "edit-member": sheetMember(rid, el.dataset.mid); break;
    case "pick-photo": $("#photoInput").click(); break;
    case "rm-photo": F.photo=null; $("#f-av").innerHTML = avatar({id:F.mid||"new", name:$("#f-name").value||"?"},"xl"); el.remove(); break;
    case "member-save": saveMember(); break;
    case "claim-here": { const {rid:r, mid} = F; closeSheet(); claim(r, mid); break; }
    case "unclaim": { delete myIds[F.rid]; saveLocal(); closeSheet(); render(); break; }
    case "member-del":
      if(!F.confirmDel){ F.confirmDel=true; el.textContent="Confirmer la suppression"; break; }
      { const {rid:r, mid} = F; if(await write(()=>remove(R(`rooms/${r}/members/${mid}`)), "Personne supprimée")){ if(myIds[r]===mid){ delete myIds[r]; saveLocal(); } closeSheet(); } }
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
    case "room-leave": { const r=F.rid; closeSheet(); leaveRoom(r); goHome(); toast("Groupe retiré de ton téléphone"); break; }
    case "room-del":
      if(!F.confirmDel){ F.confirmDel=true; el.textContent="Confirmer : tout supprimer"; break; }
      { const r=F.rid; el.disabled=true;
        if(await write(()=>remove(R(`rooms/${r}`)), "Groupe supprimé")){ closeSheet(); leaveRoom(r); goHome(); } }
      break;
  }
});

$("#photoInput").addEventListener("change", async e => {
  const f = e.target.files?.[0]; e.target.value = ""; if(!f || !F || F.type!=="member") return;
  try{ F.photo = await fileToAvatar(f); $("#f-av").innerHTML = avatar({id:F.mid||"new", name:$("#f-name").value||"?", photo:F.photo},"xl"); }
  catch{ toast("Cette image ne peut pas être lue. Essaie un JPG ou un PNG."); }
});
document.addEventListener("keydown", e => { if(e.key==="Escape" && F) closeSheet(); });
window.addEventListener("hashchange", route);
window.addEventListener("popstate", route);

/* ---------- démarrage ---------- */
try{
  S.db = getDatabase(initializeApp(await loadFirebaseConfig()));
  let first = true;
  onValue(R(".info/connected"), s => { S.online = !!s.val(); if(S.online) S.slow = false; if(!first) render(); first = false; });
  setTimeout(() => { if(myRooms.some(id => !S.loaded.has(id)) || (S.view.name==="room" && !S.rooms.has(S.view.id))){ S.slow = true; render(); } }, 10000);
  myRooms.forEach(watchRoom);
}catch(e){
  console.error(e);
  S.error = "Impossible de se connecter à la base Firebase. Vérifie l'adresse dans config.js.";
}
route();
