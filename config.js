// Configuration Firebase.
// Sur Firebase Hosting, elle est fournie automatiquement par /__/firebase/init.json
// (aucune clé à recopier). L'adresse ci-dessous sert seulement de secours ailleurs.
const FALLBACK = { databaseURL: "https://base-bonfire-default-rtdb.firebaseio.com" };

export async function loadFirebaseConfig(){
  try{
    const r = await fetch("/__/firebase/init.json", { cache: "no-store" });
    if(r.ok){ const c = await r.json(); if(c && c.databaseURL) return c; }
  }catch{}
  return FALLBACK;
}
