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

    try {
      const docSnap = await getDoc(userRef);
      if (!docSnap.exists()) return false;

      let currentLiked = docSnap.data().likedTracks || [];

      if (isLiked) {
        const newTrack = {
          title: track.title,
          artist: track.artist,
          url: track.url || "",
          cover: track.cover || "",
          id: track.id || "",
          uri: track.uri || "",
        };

        const exists = currentLiked.some(
          (t) =>
            (t.id && newTrack.id && t.id === newTrack.id) ||
            (t.title === newTrack.title && t.artist === newTrack.artist)
        );

        if (!exists) {
          currentLiked.push(newTrack);
        }
      } else {
        currentLiked = currentLiked.filter((t) => {
          if (t.id && track.id) return t.id !== track.id;
          return !(t.title === track.title && t.artist === track.artist);
        });
      }

      await setDoc(userRef, { likedTracks: currentLiked }, { merge: true });
      return true;
    } catch (error) {
      console.error("Erro toggle like:", error);
      return false;
    }
  },

  // --- NOVA FUNÇÃO PARA APAGAR EM MASSA (BULK DELETE) ---
  async deleteItems(user, folderIds = [], tracks = []) {
    if (!user) return;
    const userRef = doc(db, "leaderboard", user.uid);

    try {
      const docSnap = await getDoc(userRef);
      if (!docSnap.exists()) return false;

      const data = docSnap.data();
      let currentFolders = data.folders || [];
      let currentLiked = data.likedTracks || [];

      // 1. Remover Pastas (Filtra todas as que estão na lista para apagar)
      if (folderIds.length > 0) {
        currentFolders = currentFolders.filter(
          (f) => !folderIds.includes(f.id)
        );
      }

      // 2. Remover Músicas (Filtra todas as que correspondem)
      if (tracks.length > 0) {
        currentLiked = currentLiked.filter((t) => {
          // Verifica se a música atual (t) está na lista de remoção
          const match = tracks.some((trackToRemove) => {
            if (t.id && trackToRemove.id) return t.id === trackToRemove.id;
            return (
              t.title === trackToRemove.title &&
              t.artist === trackToRemove.artist
            );
          });
          return !match; // Mantém se NÃO houver match
        });
      }

      // Grava tudo de uma vez
      await setDoc(
        userRef,
        { folders: currentFolders, likedTracks: currentLiked },
        { merge: true }
      );
      return true;
    } catch (error) {
      console.error("Erro deleteItems:", error);
      return false;
    }
  },

  async recordDailyDropWin(user) {
    if (!user) return;
    const userRef = doc(db, "leaderboard", user.uid);
    try {
      await setDoc(
        userRef,
        { dailyDropsCompleted: increment(1) },
        { merge: true }
      );
      return true;
    } catch (error) {
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

  async createFolder(user, folderName) {
    if (!user || !folderName) return;
    const userRef = doc(db, "leaderboard", user.uid);
    const newFolder = { id: crypto.randomUUID(), name: folderName, tracks: [] };
    try {
      await setDoc(
        userRef,
        { folders: arrayUnion(newFolder) },
        { merge: true }
      );
      return true;
    } catch (e) {
      return false;
    }
  },

  async addTrackToFolder(user, folder, track) {
    const userRef = doc(db, "leaderboard", user.uid);
    const docSnap = await getDoc(userRef);
    if (!docSnap.exists()) return;
    const data = docSnap.data();
    const folders = data.folders || [];
    const targetIndex = folders.findIndex((f) => f.id === folder.id);
    if (targetIndex === -1) return;
    if (!folders[targetIndex].tracks.some((t) => t.title === track.title)) {
      folders[targetIndex].tracks.push(track);
      await setDoc(userRef, { folders }, { merge: true });
    }
  },

  async deleteFolder(user, folderId) {
    // Mantemos esta para compatibilidade, mas o deleteItems faz o mesmo
    return this.deleteItems(user, [folderId], []);
  },
};
