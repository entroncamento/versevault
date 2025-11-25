import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getCountFromServer,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { app } from "../firebase";

const db = getFirestore(app);

export const leaderboardApi = {
  // ... (addScore e getUserStats mantêm-se iguais) ...

  async addScore(user, points, metadata = {}) {
    if (!user) return;
    const userRef = doc(db, "leaderboard", user.uid);
    const statsUpdate = {};

    if (metadata.artists && Array.isArray(metadata.artists)) {
      metadata.artists.forEach((artist) => {
        const safeKey = artist.replace(/\./g, "");
        statsUpdate[`stats.artists.${safeKey}`] = increment(1);
      });
    }

    if (metadata.genre) {
      const safeKey = metadata.genre.replace(/\./g, "");
      statsUpdate[`stats.genres.${safeKey}`] = increment(1);
    }

    try {
      await setDoc(
        userRef,
        {
          username: user.displayName || user.email.split("@")[0],
          photoURL: user.photoURL || "/icons/Minesweeper.ico",
          totalScore: increment(points),
          gamesPlayed: increment(1),
          lastPlayed: serverTimestamp(),
          ...statsUpdate,
        },
        { merge: true }
      );
      return true;
    } catch (error) {
      console.error("Erro score:", error);
      return false;
    }
  },

  async getUserStats(uid) {
    if (!uid) return null;
    try {
      const docRef = doc(db, "leaderboard", uid);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      return null;
    }
  },

  async getUserRank(userScore) {
    if (!userScore) return "-";
    try {
      const q = query(
        collection(db, "leaderboard"),
        where("totalScore", ">", userScore)
      );
      const snapshot = await getCountFromServer(q);
      return snapshot.data().count + 1;
    } catch (error) {
      return "-";
    }
  },

  // --- NOVO: Calcular Rank Específico (Artista ou Género) ---
  async getStatRank(category, itemName, userCount) {
    if (!itemName || !userCount) return null;
    try {
      // Recria a chave segura (ex: "Dr. Dre" -> "Dr Dre") para buscar na BD
      const safeKey = itemName.replace(/\./g, "");
      const fieldPath = `stats.${category}.${safeKey}`;

      // Conta quantos utilizadores têm um valor MAIOR que o teu nesse campo
      const q = query(
        collection(db, "leaderboard"),
        where(fieldPath, ">", userCount)
      );

      const snapshot = await getCountFromServer(q);
      return snapshot.data().count + 1; // Se 0 pessoas têm mais, tu és o #1
    } catch (error) {
      console.error("Erro rank stat:", error);
      return null;
    }
  },

  async getTopPlayers() {
    // (Código igual ao anterior para poupar espaço, mantém o que tinhas)
    const CACHE_KEY = "leaderboard_cache_v1";
    try {
      const q = query(
        collection(db, "leaderboard"),
        orderBy("totalScore", "desc"),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc, index) => ({
        id: doc.id,
        rank: index + 1,
        ...doc.data(),
      }));
    } catch (e) {
      return [];
    }
  },
};
