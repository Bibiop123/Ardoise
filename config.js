// Configuration Firebase du projet Ardoise (l-ar-7a10a).
// Sur Firebase Hosting, la clé d'API est lue automatiquement depuis /__/firebase/init.json.
// Ces informations ne sont pas secrètes : la sécurité est assurée par database.rules.json.
const CONFIG = {
  projectId: "l-ar-7a10a",
  authDomain: "l-ar-7a10a.firebaseapp.com",
  databaseURL: "https://l-ar-7a10a-default-rtdb.europe-west1.firebasedatabase.app",
};

export async function loadFirebaseConfig(){
  try{
    const r = await fetch("/__/firebase/init.json", { cache: "no-store" });
    if(r.ok){ const c = await r.json(); return { ...c, ...CONFIG, apiKey: c.apiKey, appId: c.appId }; }
  }catch{}
  return CONFIG;
}
