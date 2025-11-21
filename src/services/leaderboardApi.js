import {
  getFirestore,
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { app } from "../firebase"; // Certifica-te que exportaste 'app' do teu firebase.js

const db = getFirestore(app);

export const leaderboardApi = {
  // Adicionar pontos ao utilizador (Acumulativo)
  async addScore(user, points) {
    if (!user) return;

    const userRef = doc(db, "leaderboard", user.uid);

    try {
      // setDoc com { merge: true } cria o documento se não existir
      // ou atualiza se já existir.
      await setDoc(
        userRef,
        {
          username: user.displayName || user.email.split("@")[0],
          photoURL: user.photoURL || "/icons/Minesweeper.ico",
          totalScore: increment(points), // A magia acontece aqui: soma ao valor anterior
          lastPlayed: serverTimestamp(),
        },
        { merge: true }
      );

      console.log("Pontos salvos com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar pontos:", error);
    }
  },

  // Buscar o Top 10
  async getTopPlayers() {
    // Implementação otimizada: stale-while-revalidate usando localStorage
    const CACHE_KEY = "leaderboard_cache_v1";
    const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

    const readCache = () => {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed;
      } catch (e) {
        return null;
      }
    };

    const writeCache = (data) => {
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ ts: Date.now(), data })
        );
      } catch (e) {
        // ignore
      }
    };

    const fetchRemote = async () => {
      try {
        const q = query(
          collection(db, "leaderboard"),
          orderBy("totalScore", "desc"),
          limit(10)
        );

        const querySnapshot = await getDocs(q);
        const result = querySnapshot.docs.map((doc, index) => ({
          id: doc.id,
          rank: index + 1,
          ...doc.data(),
        }));

        writeCache(result);
        return result;
      } catch (error) {
        console.error("Erro ao buscar leaderboard:", error);
        // If remote fetch fails, try to return existing cache as a fallback
        try {
          const raw = localStorage.getItem(CACHE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            return parsed.data || [];
          }
        } catch (e) {
          // ignore
        }
        return [];
      }
    };

    try {
      const cache = readCache();

      if (cache) {
        // Always return cached data immediately to avoid flash/empty state.
        // If cache is stale, revalidate in background.
        if (Date.now() - cache.ts >= CACHE_TTL) {
          // Revalidate in background but don't block UI
          fetchRemote();
        }
        return cache.data;
      }

      // No cache at all -> fetch remote (blocking)
      const remote = await fetchRemote();
      return remote;
    } catch (e) {
      console.error("Erro no cache da leaderboard:", e);
      return await fetchRemote();
    }
  },
};
