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
    } catch (error) {
      console.error("Erro ao buscar leaderboard:", error);
      return [];
    }
  },
};
