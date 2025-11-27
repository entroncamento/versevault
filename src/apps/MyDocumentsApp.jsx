import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { leaderboardApi } from "../services/leaderboardApi";
import { useWindowManager } from "../contexts/WindowManagerContext";

const PROXY_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const MyDocumentsApp = ({ windowId }) => {
  const { currentUser } = useAuth();
  const { openWindow } = useWindowManager(); // <--- Hook para abrir apps

  const [currentPath, setCurrentPath] = useState("ROOT");
  const [folders, setFolders] = useState([]);
  const [likedTracks, setLikedTracks] = useState([]);
  const [spotifyToken, setSpotifyToken] = useState(null);

  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    folderId: null,
  });

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    const stats = await leaderboardApi.getUserStats(currentUser.uid);
    if (stats) {
      setLikedTracks(stats.likedTracks || []);
      setFolders(stats.folders || []);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData, currentPath]);

  // Fecha o menu se clicar em qualquer outro lugar
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        setContextMenu({ ...contextMenu, visible: false });
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [contextMenu]);

  const handlePlayTrack = (track) => {
    openWindow("MEDIA_PLAYER", { trackToPlay: track });
  };

  const handleContextMenu = (e, folderId) => {
    e.preventDefault();
    e.stopPropagation();

    const x = e.pageX;
    const y = e.pageY;

    setContextMenu({
      visible: true,
      x,
      y,
      folderId,
    });
  };

  // --- NOVO: Lógica que executa a exclusão após confirmação ---
  const performDeletion = async (folderId) => {
    try {
      await leaderboardApi.deleteFolder(currentUser, folderId);
      await loadData(); // Recarrega a lista
    } catch (error) {
      console.error("Erro ao apagar pasta:", error);
      alert("Could not delete folder.");
    }
  };

  // --- MODIFICADO: Substituímos o 'confirm()' nativo pela abertura de uma janela customizada ---
  const handleDeleteFolder = () => {
    const folderId = contextMenu.folderId;
    const folderToDelete = folders.find((f) => f.id === folderId);
    if (!folderToDelete) return;

    setContextMenu({ ...contextMenu, visible: false }); // Fechar o menu de contexto

    // Abre uma nova janela de diálogo de confirmação.
    // É necessário ter o 'CONFIRM_DIALOG' registado no WindowManager
    // e estilizado como um pop-up XP (com botões OK/Cancel).
    openWindow("CONFIRM_DIALOG", {
      title: "Confirm File Delete",
      message: `Are you sure you want to delete the folder "${folderToDelete.name}" and all its contents? This cannot be undone.`,
      icon: "warning", // Para o ícone de aviso XP
      // Passa a função de exclusão como callback para o diálogo
      onConfirm: () => performDeletion(folderId),

      // Parâmetros opcionais para o diálogo:
      width: 300,
      height: 150,
      resizable: false,
      maximizable: false,
    });
  };

  // ... (funções connectSpotify, handleDragStart, handleDropOnFolder, handleExport, createNewFolder mantêm-se iguais) ...
  const connectSpotify = () => {
    const popup = window.open(
      `${PROXY_BASE}/api/spotify/login`,
      "Spotify Login",
      "width=500,height=600"
    );
    const receiveMessage = (event) => {
      if (event.data.type === "SPOTIFY_TOKEN") {
        setSpotifyToken(event.data.token);
        alert("Spotify conectado com sucesso! 🟢");
        window.removeEventListener("message", receiveMessage);
      }
    };
    window.addEventListener("message", receiveMessage, false);
  };

  const handleDragStart = (e, track) => {
    e.dataTransfer.setData("track", JSON.stringify(track));
  };

  const handleDropOnFolder = async (e, folder) => {
    e.preventDefault();
    const trackData = JSON.parse(e.dataTransfer.getData("track"));
    await leaderboardApi.addTrackToFolder(currentUser, folder, trackData);
    loadData();
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleExport = async (folder) => {
    if (!spotifyToken) {
      const confirmLogin = confirm(
        "O Spotify não está conectado. Queres fazer login agora?"
      );
      if (confirmLogin) connectSpotify();
      return;
    }
    const uris = folder.tracks.map((t) => t.uri).filter((u) => u);
    if (uris.length === 0)
      return alert("Pasta vazia ou músicas sem URI Spotify.");

    try {
      await fetch(`${PROXY_BASE}/api/spotify/create-playlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: spotifyToken,
          name: folder.name,
          trackUris: uris,
        }),
      });
      alert("Playlist criada no teu Spotify com sucesso! 🎵");
    } catch (error) {
      alert("Erro ao criar playlist.");
    }
  };

  const createNewFolder = async () => {
    const name = prompt("Nome da nova pasta:");
    if (name) {
      const success = await leaderboardApi.createFolder(currentUser, name);
      if (success) await loadData();
    }
  };

  return (
    <div className="flex h-full font-sans text-xs select-none bg-white relative">
      {/* --- Menu de Contexto (Visual) --- */}
      {contextMenu.visible && (
        <div
          className="fixed z-50 bg-[#D4D0C8] border-2 border-white border-r-gray-600 border-b-gray-600 shadow-md py-1 min-w-[120px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="px-4 py-1 hover:bg-[#000080] hover:text-white cursor-pointer flex items-center gap-2"
            onClick={handleDeleteFolder} // CHAMADA AGORA ABRE O CONFIRM_DIALOG
          >
            <span>🗑️ Delete</span>
          </div>
          <div
            className="px-4 py-1 hover:bg-[#000080] hover:text-white cursor-pointer"
            onClick={() => setContextMenu({ ...contextMenu, visible: false })}
          >
            Cancel
          </div>
        </div>
      )}

      {/* Sidebar Azul */}
      <div className="w-48 bg-gradient-to-b from-[#7CA0DA] to-[#62799D] p-3 text-white hidden md:block overflow-y-auto">
        <div className="mb-4">
          <h3 className="font-bold mb-2 cursor-default">
            File and Folder Tasks
          </h3>
          <button
            onClick={createNewFolder}
            className="flex items-center gap-2 hover:underline cursor-pointer mb-1 text-left w-full"
          >
            <img
              src="/icons/folder_new.png"
              className="w-4 h-4"
              onError={(e) => (e.target.style.display = "none")}
            />
            Make a new folder
          </button>
          {currentPath !== "ROOT" && (
            <button
              onClick={() =>
                handleExport(folders.find((f) => f.id === currentPath))
              }
              className="flex items-center gap-2 hover:underline cursor-pointer text-[#D4FFD6] font-bold mt-2 text-left w-full"
            >
              <span className="text-lg leading-none">➦</span> Export to Spotify
            </button>
          )}
        </div>
        <div className="mb-4">
          <h3 className="font-bold mb-2 cursor-default">Other Places</h3>
          <button
            onClick={() => setCurrentPath("ROOT")}
            className="flex items-center gap-2 hover:underline cursor-pointer text-left w-full"
          >
            <img src="/icons/MyComputer.ico" className="w-4 h-4" />
            My Computer
          </button>
        </div>
        <div className="mt-auto pt-4">
          <h3 className="font-bold mb-2 cursor-default">Details</h3>
          {!spotifyToken ? (
            <button
              onClick={connectSpotify}
              className="flex items-center gap-2 hover:underline cursor-pointer text-yellow-200 font-bold"
            >
              <span className="w-4 h-4 bg-black rounded-full flex items-center justify-center text-[10px]">
                ♫
              </span>{" "}
              Connect Spotify
            </button>
          ) : (
            <div className="flex items-center gap-2 text-green-200">
              <span className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-black text-[10px] font-bold">
                ✓
              </span>{" "}
              Spotify Online
            </div>
          )}
        </div>
      </div>

      {/* Área Principal */}
      <div className="flex-grow flex flex-col bg-white">
        <div className="p-1 border-b border-gray-300 bg-[#ECE9D8] flex gap-2 items-center shadow-sm relative z-10">
          <span className="text-gray-500 pl-1">Address:</span>
          <div className="bg-white border border-[#7F9DB9] px-2 py-0.5 w-full text-black shadow-inner truncate">
            C:\Documents and Settings\{currentUser?.displayName || "User"}\My
            Documents\
            {currentPath === "ROOT"
              ? ""
              : folders.find((f) => f.id === currentPath)?.name}
          </div>
        </div>

        <div
          className="flex-grow p-4 overflow-auto bg-white"
          onClick={() => setContextMenu({ ...contextMenu, visible: false })}
        >
          <div className="grid grid-cols-4 md:grid-cols-5 gap-4 content-start">
            {/* MODO RAIZ */}
            {currentPath === "ROOT" && (
              <>
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    onDoubleClick={() => setCurrentPath(folder.id)}
                    onContextMenu={(e) => handleContextMenu(e, folder.id)}
                    onDrop={(e) => handleDropOnFolder(e, folder)}
                    onDragOver={handleDragOver}
                    className="flex flex-col items-center group w-20 cursor-pointer p-1 border border-transparent hover:border-[#316AC5]/50 hover:bg-[#316AC5]/10 rounded-sm"
                  >
                    <img
                      src="/icons/folder_closed.png"
                      className="w-10 h-10 drop-shadow-sm"
                      onError={(e) =>
                        (e.target.src =
                          "https://win98icons.alexmeub.com/icons/png/directory_closed-4.png")
                      }
                    />
                    <span className="text-center mt-1 px-1 rounded w-full break-words group-hover:bg-[#316AC5] group-hover:text-white">
                      {folder.name}
                    </span>
                  </div>
                ))}

                {likedTracks.map((track, idx) => (
                  <div
                    key={`${track.title}-${idx}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, track)}
                    onDoubleClick={() => handlePlayTrack(track)}
                    className="flex flex-col items-center group w-20 cursor-grab active:cursor-grabbing p-1 border border-transparent hover:border-[#316AC5]/50 hover:bg-[#316AC5]/10 rounded-sm"
                  >
                    <img
                      src="/icons/media_file.png"
                      className="w-8 h-8 mb-1 drop-shadow-sm"
                      onError={(e) =>
                        (e.target.src =
                          "https://win98icons.alexmeub.com/icons/png/cd_audio_cd_a-0.png")
                      }
                    />
                    <span className="text-center mt-1 px-1 rounded line-clamp-2 text-[10px] w-full group-hover:bg-[#316AC5] group-hover:text-white">
                      {track.title}.mp3
                    </span>
                    <span className="text-[9px] text-gray-400 truncate w-full text-center group-hover:text-[#316AC5]/50">
                      {track.artist}
                    </span>
                  </div>
                ))}
              </>
            )}

            {/* MODO DENTRO DA PASTA */}
            {currentPath !== "ROOT" && (
              <>
                <div
                  onDoubleClick={() => setCurrentPath("ROOT")}
                  className="flex flex-col items-center group w-20 cursor-pointer opacity-70 p-1 border border-transparent hover:border-[#316AC5]/50 hover:bg-[#316AC5]/10 rounded-sm"
                >
                  <img
                    src="https://win98icons.alexmeub.com/icons/png/directory_open_file_mydocs-4.png"
                    className="w-10 h-10 drop-shadow-sm"
                  />
                  <span className="text-center mt-1 px-1 rounded group-hover:bg-[#316AC5] group-hover:text-white">
                    .. (Up)
                  </span>
                </div>

                {folders
                  .find((f) => f.id === currentPath)
                  ?.tracks.map((track, idx) => (
                    <div
                      key={idx}
                      onDoubleClick={() => handlePlayTrack(track)}
                      className="flex flex-col items-center group w-20 p-1 border border-transparent hover:border-[#316AC5]/50 hover:bg-[#316AC5]/10 rounded-sm"
                    >
                      <img
                        src="https://win98icons.alexmeub.com/icons/png/cd_audio_cd_a-0.png"
                        className="w-8 h-8 mb-1 drop-shadow-sm"
                      />
                      <span className="text-center mt-1 px-1 rounded line-clamp-2 text-[10px] w-full group-hover:bg-[#316AC5] group-hover:text-white">
                        {track.title}
                      </span>
                    </div>
                  ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyDocumentsApp;
