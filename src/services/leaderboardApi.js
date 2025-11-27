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

    // CORREÇÃO: Adicionado 'uri' para permitir exportação para Spotify
    const trackData = {
      title: track.title,
      artist: track.artist,
      url: track.url || "",
      cover: track.cover || "",
      id: track.id || "",
      uri: track.uri || "", // <--- O FUNDAMENTAL ESTÁ AQUI
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

  // --- NOVAS FUNÇÕES PARA O MY DOCUMENTS ---

  async createFolder(user, folderName) {
    if (!user || !folderName) return;
    const userRef = doc(db, "leaderboard", user.uid);
    const newFolder = {
      id: crypto.randomUUID(), // Gera ID único (Nativo do browser)
      name: folderName,
      tracks: [], // Array de IDs ou Track Objects
    };

    try {
      await setDoc(
        userRef,
        {
          folders: arrayUnion(newFolder),
        },
        { merge: true }
      );
      return true;
    } catch (e) {
      console.error("Erro criar pasta:", e);
      return false;
    }
  },

  async addTrackToFolder(user, folder, track) {
    const userRef = doc(db, "leaderboard", user.uid);
    const docSnap = await getDoc(userRef);
    if (!docSnap.exists()) return;

    const data = docSnap.data();
    const folders = data.folders || [];

    const targetFolderIndex = folders.findIndex((f) => f.id === folder.id);
    if (targetFolderIndex === -1) return;

    // Adiciona track se não existir
    const trackExists = folders[targetFolderIndex].tracks.some(
      (t) => t.title === track.title
    );
    if (!trackExists) {
      folders[targetFolderIndex].tracks.push(track);
      await setDoc(userRef, { folders }, { merge: true });
    }
  },

  // --- NOVO: REMOVER PASTA ---
  async deleteFolder(user, folderId) {
    if (!user || !folderId) return;

    const userRef = doc(db, "leaderboard", user.uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) return false;

    const data = docSnap.data();
    const folders = data.folders || [];

    // Filtra o array, removendo o objeto da pasta que corresponde ao folderId
    const updatedFolders = folders.filter((f) => f.id !== folderId);

    try {
      // Atualiza o documento no Firestore com o novo array de pastas
      await setDoc(userRef, { folders: updatedFolders }, { merge: true });
      return true;
    } catch (e) {
      console.error("Erro ao apagar pasta:", e);
      return false;
    }
  },
};
