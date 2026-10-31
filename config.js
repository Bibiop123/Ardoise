// Configuration Firebase du projet Ardoise (l-ar-7a10a).
// Ces informations ne sont pas secrètes : la sécurité est assurée par database.rules.json.
const CONFIG = {
  projectId: "l-ar-7a10a",
  databaseURL: "https://l-ar-7a10a-default-rtdb.europe-west1.firebasedatabase.app",
};

export async function loadFirebaseConfig(){
  return CONFIG;
}
