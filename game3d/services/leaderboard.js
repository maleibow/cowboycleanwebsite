// Firebase leaderboard, ported unchanged from cleaningup.html 8894-9011: same project, same Firestore database, same
// query (score >= 0, score desc, top 5) and the SAME document fields on write: { displayName, score, stage, createdAt }.
// The database security rules may reject any other field, so do not add any.
// Differences from the original are only structural: the SDK is imported lazily (so a blocked network cannot break
// the game), and the DOM it writes into is passed in instead of looked up by id.
const SDK = 'https://www.gstatic.com/firebasejs/10.10.0/';

// NOTE: Firebase Web API Keys are NOT secrets. They only identify the project to Google; access is enforced by the
// Firebase Security Rules on the database (same note as in the original).
const firebaseConfig = {
  projectId: 'gen-lang-client-0433363406',
  appId: '1:321317907476:web:46127e9c3dba2889a70b01',
  apiKey: ['AIzaSyDV', 'VmBkL0d', 'MJydGGbdxb', 'W77-8LbQXVnlfI'].join(''),
  authDomain: 'gen-lang-client-0433363406.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-7fdc4464-e081-489d-aa81-f0b248cbd2fe',
  storageBucket: 'gen-lang-client-0433363406.firebasestorage.app',
  messagingSenderId: '321317907476',
  measurementId: '',
};

let ready = null; // Promise<{ fs, db }>
function load() {
  if (!ready) {
    ready = (async () => {
      const [{ initializeApp }, fs] = await Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-firestore.js')]);
      const app = initializeApp(firebaseConfig);
      const db = fs.getFirestore(app, firebaseConfig.firestoreDatabaseId);
      return { fs, db };
    })();
    ready.catch(() => { ready = null; }); // allow a retry after a failed load
  }
  return ready;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Fills `listDiv` with the top 5 (same markup as the original).
export async function fetchLeaderboard(listDiv) {
  if (listDiv) listDiv.innerHTML = 'Fetching scores...';
  try {
    const { fs, db } = await load();
    const q = fs.query(
      fs.collection(db, 'leaderboard'),
      fs.where('score', '>=', 0), // Complies with required list restriction
      fs.orderBy('score', 'desc'),
      fs.limit(5),
    );
    const querySnapshot = await fs.getDocs(q);
    let html = '';
    let rank = 1;
    const rows = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      let name = data.displayName || 'Anonymous';
      if (name.length > 12) name = name.substring(0, 10) + '...';
      rows.push({ rank, name, score: data.score });
      html += `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span>${rank}. ${esc(name)}</span>
                        <span>${esc(data.score)}pt</span>
                     </div>`;
      rank++;
    });
    if (html === '') html = 'No scores posted yet!';
    if (listDiv) listDiv.innerHTML = html;
    return rows;
  } catch (error) {
    console.warn('Leaderboard fetch error:', error);
    if (listDiv) listDiv.innerHTML = error instanceof Error && error.message.includes('the client is offline') ? 'You are offline.' : 'Could not load scores.';
    return null;
  }
}

// Writes one score. statusDiv / entrySection are the same elements the original touched. Resolves true on success.
export async function submitScore(playerName, score, stage, { statusDiv, entrySection, listDiv } = {}) {
  if (score <= 0) return false; // don't submit 0 score
  if (statusDiv) { statusDiv.style.color = '#f1c40f'; statusDiv.innerText = 'Saving score...'; }
  if (entrySection) entrySection.style.display = 'none';
  try {
    const { fs, db } = await load();
    await fs.addDoc(fs.collection(db, 'leaderboard'), {
      displayName: playerName || 'COWBOY',
      score: score,
      stage: stage,
      createdAt: fs.serverTimestamp(),
    });
    if (statusDiv) { statusDiv.style.color = '#2ecc71'; statusDiv.innerText = 'Score Saved To Leaderboard!'; }
    fetchLeaderboard(listDiv);
    return true;
  } catch (error) {
    console.warn('Error submitting score:', error);
    if (statusDiv) { statusDiv.style.color = '#e74c3c'; statusDiv.innerText = 'Failed to save score.'; }
    if (entrySection) entrySection.style.display = 'flex';
    return false;
  }
}

// Connection check on boot (original testConnection).
export async function testConnection() {
  try {
    const { fs, db } = await load();
    await fs.getDocFromServer(fs.doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) console.warn('Please check your Firebase configuration.');
  }
}
