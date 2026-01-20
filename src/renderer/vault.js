// import { db } from "./firebase";
// import {
//   collection,
//   addDoc,
//   getDocs,
//   query,
//   where
// } from "firebase/firestore";

// export async function addPassword(userId, data) {
//   return addDoc(collection(db, "passwords"), {
//     userId,
//     ...data,
//     createdAt: Date.now()
//   });
// }

// export async function getPasswords(userId) {
//   const q = query(
//     collection(db, "passwords"),
//     where("userId", "==", userId)
//   );

//   const snapshot = await getDocs(q);
//   return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
// }
