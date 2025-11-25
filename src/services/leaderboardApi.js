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
import { app } from "../firebase";

const db = getFirestore(app);

export const leaderboardApi = {
  // Adicionar pontos ao utilizador (Acumulativo)
  async addScore(user, points) {
    if (!user) return;

    const userRef = doc(db, "leaderboard", user.uid);

    try {
      console.log(
        `📝 A tentar salvar ${points} pontos para ${user.displayName}...`
      );

      await setDoc(
        userRef,
        {
          username: user.displayName || user.email.split("@")[0],
          photoURL: user.photoURL || "/icons/Minesweeper.ico",
          totalScore: increment(points),
          lastPlayed: serverTimestamp(),
        },
        { merge: true }
      );

      console.log("✅ Pontos salvos com sucesso!");
      return true; // Sucesso
    } catch (error) {
      console.error("❌ Erro Crítico ao salvar pontos:", error);

      // Deteta se foi bloqueado por AdBlocker
      if (
        (error.message && error.message.includes("offline")) ||
        error.code === "unavailable"
      ) {
        alert(
          "⚠️ Erro: O teu AdBlocker impediu o jogo de salvar a pontuação.\n\nPor favor desativa o AdBlocker no localhost e tenta de novo."
        );
      } else {
        alert("Failed to save score. Check console for details.");
      }
      return false; // Falha
    }
  },

  // Buscar o Top 10
  async getTopPlayers() {
    const CACHE_KEY = "leaderboard_cache_v1";
    // Reduzi o tempo de cache para 1 minuto para veres os resultados mais depressa enquanto testas
    const CACHE_TTL = 1000 * 60 * 1;

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
      } catch (e) {}
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
        // Se falhar (ex: AdBlocker), tenta mostrar a cache antiga
        const cache = readCache();
        return cache ? cache.data : [];
      }
    };

    try {
      const cache = readCache();
      if (cache && Date.now() - cache.ts < CACHE_TTL) {
        return cache.data;
      }
      return await fetchRemote();
    } catch (e) {
      return await fetchRemote();
    }
  },
};
