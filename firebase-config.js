// ═══════════════════════════════════════════════════
// firebase-config.js  –  הגדרות Firebase + Auth + DB
// ═══════════════════════════════════════════════════
// הדבק כאן את הערכים מ-Firebase Console → Project Settings → Your Apps
 
export const firebaseConfig = {
  apiKey:            "REPLACE_WITH_YOUR_API_KEY",
  authDomain:        "REPLACE_WITH_YOUR_AUTH_DOMAIN",       // xxx.firebaseapp.com
  projectId:         "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket:     "REPLACE_WITH_YOUR_STORAGE_BUCKET",    // xxx.appspot.com
  messagingSenderId: "REPLACE_WITH_YOUR_SENDER_ID",
  appId:             "REPLACE_WITH_YOUR_APP_ID"
};
 
// ─── טען Firebase מ-CDN (ES Module) ───────────────
import { initializeApp }           from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
                                   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, addDoc, getDocs, deleteDoc, serverTimestamp, query, orderBy, limit }
                                   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject }
                                   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
 
const app     = initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);
 
// ═══════════════════════════════════════════════════
// AUTH HELPERS
// ═══════════════════════════════════════════════════
 
/** כניסה עם Google – מחזיר את המשתמש */
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  await ensureUserDoc(result.user);
  return result.user;
}
 
/** יצירת מסמך משתמש ב-Firestore אם לא קיים */
async function ensureUserDoc(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid:       user.uid,
      email:     user.email,
      name:      user.displayName || "",
      avatar:    user.photoURL    || "",
      xp:        20,
      streak:    1,
      lastLogin: serverTimestamp(),
      createdAt: serverTimestamp(),
      profile:   { domain: "", skills: [], strengths: [], exp: "", jobTypes: [] }
    });
  } else {
    // עדכון lastLogin בלבד
    await updateDoc(ref, { lastLogin: serverTimestamp() });
  }
}
 
/** התנתקות */
export function logout() { return signOut(auth); }
 
/** מאזין לשינוי מצב (קורא callback עם user | null) */
export function onAuthChange(cb) { return onAuthStateChanged(auth, cb); }
 
// ═══════════════════════════════════════════════════
// USER PROFILE
// ═══════════════════════════════════════════════════
 
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}
 
export async function saveUserProfile(uid, profileData) {
  await updateDoc(doc(db, "users", uid), {
    profile:   profileData,
    updatedAt: serverTimestamp()
  });
}
 
export async function addXPToUser(uid, amount, reason = "") {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return;
  const current = snap.data().xp || 0;
  await updateDoc(doc(db, "users", uid), { xp: current + amount });
  // לוג אירוע
  await addDoc(collection(db, "users", uid, "xpEvents"), {
    amount, reason, at: serverTimestamp()
  });
}
 
// ═══════════════════════════════════════════════════
// RESUMES  (שמירה / טעינה / מחיקה)
// ═══════════════════════════════════════════════════
 
/** שמור קורות חיים (JSON) – מחזיר את ה-ID */
export async function saveResume(uid, resumeData, resumeId = null) {
  if (resumeId) {
    await setDoc(doc(db, "users", uid, "resumes", resumeId), {
      ...resumeData,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return resumeId;
  }
  const docRef = await addDoc(collection(db, "users", uid, "resumes"), {
    ...resumeData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
}
 
/** טען את כל קורות החיים של משתמש */
export async function getResumes(uid) {
  const q    = query(collection(db, "users", uid, "resumes"), orderBy("updatedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
 
/** מחק קורות חיים */
export async function deleteResume(uid, resumeId) {
  await deleteDoc(doc(db, "users", uid, "resumes", resumeId));
}
 
/** העלה קובץ PDF ל-Storage, מחזיר download URL */
export async function uploadResumePDF(uid, file) {
  const path    = `resumes/${uid}/${Date.now()}_${file.name}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  return { url: await getDownloadURL(fileRef), path };
}
 
/** מחק קובץ מ-Storage לפי path */
export async function deleteResumeFile(path) {
  await deleteObject(ref(storage, path));
}
 
// ═══════════════════════════════════════════════════
// JOB ANALYSES  (היסטוריית ניתוחי משרות)
// ═══════════════════════════════════════════════════
 
export async function saveJobAnalysis(uid, analysisData) {
  const docRef = await addDoc(collection(db, "users", uid, "jobAnalyses"), {
    ...analysisData,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}
 
export async function getJobAnalyses(uid, maxResults = 20) {
  const q    = query(collection(db, "users", uid, "jobAnalyses"), orderBy("createdAt", "desc"), limit(maxResults));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
 
// ═══════════════════════════════════════════════════
// INTERVIEW SESSIONS  (ראיונות ותוצאות)
// ═══════════════════════════════════════════════════
 
export async function saveInterviewSession(uid, sessionData) {
  const docRef = await addDoc(collection(db, "users", uid, "interviews"), {
    ...sessionData,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}
 
export async function getInterviewHistory(uid, maxResults = 10) {
  const q    = query(collection(db, "users", uid, "interviews"), orderBy("createdAt", "desc"), limit(maxResults));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
 
