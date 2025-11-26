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
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { app } from "../firebase";

const db = getFirestore(app);

export const leaderboardApi = {
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

  async toggleLike(user, track, isLiked) {
    if (!user) return;
    const userRef = doc(db, "leaderboard", user.uid);

    // ATUALIZAÇÃO: Agora guardamos URL e Capa para poder tocar a partir da lista de likes
    const trackData = {
      title: track.title,
      artist: track.artist,
      url: track.url || "",
      cover: track.cover || "",
      id: track.id || "",
    };

    try {
      await setDoc(
        userRef,
        {
          likedTracks: isLiked ? arrayUnion(trackData) : arrayRemove(trackData),
        },
        { merge: true }
      );
      return true;
    } catch (error) {
      console.error("Erro toggle like:", error);
      return false;
    }
  },

  async recordDailyDropWin(user) {
    if (!user) return;
    const userRef = doc(db, "leaderboard", user.uid);

    try {
      await setDoc(
        userRef,
        {
          username: user.displayName || user.email.split("@")[0],
          photoURL: user.photoURL || "/icons/Minesweeper.ico",
          dailyDropsCompleted: increment(1),
        },
        { merge: true }
      );
      return true;
    } catch (error) {
      console.error("Erro ao registrar Daily Drop:", error);
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

  async getStatRank(category, itemName, userCount) {
    if (!itemName || !userCount) return null;
    try {
      const safeKey = itemName.replace(/\./g, "");
      const fieldPath = `stats.${category}.${safeKey}`;
      const q = query(
        collection(db, "leaderboard"),
        where(fieldPath, ">", userCount)
      );
      const snapshot = await getCountFromServer(q);
      return snapshot.data().count + 1;
    } catch (error) {
      console.error("Erro rank stat:", error);
      return null;
    }
  },

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
    } catch (e) {
      return [];
    }
  },
};
