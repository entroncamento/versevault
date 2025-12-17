import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { leaderboardApi } from "../services/leaderboardApi";
import { useWindowManager } from "../contexts/WindowManagerContext";

const PROXY_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Aplicação "My Documents" (Gestor de Ficheiros).
 * Implementa lógica complexa de UI:
 * - Seleção Múltipla (Drag Selection Box).
 * - Navegação Hierárquica (Root -> Folder).
 * - Drag & Drop de Ficheiros para Pastas.
 * - Menu de Contexto Customizado.
 */
const MyDocumentsApp = ({ windowId }) => {
  const { currentUser } = useAuth();
  const { openWindow } = useWindowManager();

  // --- STATE: DADOS ---
  const [currentPath, setCurrentPath] = useState("ROOT"); // "ROOT" ou ID da pasta
  const [folders, setFolders] = useState([]);
  const [likedTracks, setLikedTracks] = useState([]);

  // --- STATE: UI & INTERAÇÃO ---
  const [spotifyToken, setSpotifyToken] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set()); // Set para O(1) lookups
  const [selectionBox, setSelectionBox] = useState(null); // Caixa azul de seleção
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    type: null,
    data: null,
  });

  // --- REFS (Para evitar re-renders durante operações de alta frequência como drag) ---
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null); // Ref para a área de scroll

  // =========================================================
  // 1. DATA FETCHING
  // =========================================================
  const loadData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const stats = await leaderboardApi.getUserStats(currentUser.uid);
      if (stats) {
        setLikedTracks(stats.likedTracks || []);
        setFolders(stats.folders || []);
      }
    } catch (error) {
      console.error("Erro ao carregar documentos:", error);
    }
  }, [currentUser]);

  // Carrega dados inicial e limpa seleção ao navegar
  useEffect(() => {
    loadData();
    setSelectedItems(new Set());
  }, [loadData, currentPath]);

  // Listener global para fechar menus de contexto ao clicar fora
  useEffect(() => {
    const handleGlobalClick = () => {
      if (contextMenu.visible)
        setContextMenu({ ...contextMenu, visible: false });
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [contextMenu]);

  // =========================================================
  // 2. INTEGRAÇÃO SPOTIFY (Exportação)
  // =========================================================
  const connectSpotify = () => {
    const popup = window.open(
      `${PROXY_BASE}/api/spotify/login`,
      "Spotify Login",
      "width=500,height=600"
    );

    // Comunicação segura via PostMessage
    const receiveMessage = (event) => {
      if (event.data.type === "SPOTIFY_TOKEN") {
        setSpotifyToken(event.data.token);
        // Feedback visual simples (poderia ser um modal customizado)
        alert("Spotify Connected!");
        window.removeEventListener("message", receiveMessage);
      }
    };
    window.addEventListener("message", receiveMessage, false);
  };

  const handleExport = async (folder) => {
    if (!spotifyToken) {
      openWindow("CONFIRM_DIALOG", {
        title: "Spotify Login",
        message: "Connect Spotify to export playlist?",
        icon: "warning",
        onConfirm: connectSpotify,
      });
      return;
    }

    // Prepara payload
    const searchTerms = folder.tracks.map((t) => `${t.artist} ${t.title}`);
    if (searchTerms.length === 0) return alert("Folder is empty.");

    try {
      await fetch(`${PROXY_BASE}/api/spotify/create-playlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: spotifyToken,
          name: folder.name,
          trackUris: searchTerms,
        }),
      });
      alert("Playlist exported to your Spotify account!");
    } catch (error) {
      alert("Export failed. Check console.");
      console.error(error);
    }
  };

  // =========================================================
  // 3. LÓGICA DE SELEÇÃO (DRAG BOX ENGINE)
  // =========================================================

  // Alterna seleção individual (Ctrl+Click)
  const toggleSelection = (id, multiSelect) => {
    const newSet = new Set(multiSelect ? selectedItems : []);
    if (newSet.has(id)) {
      if (multiSelect) newSet.delete(id);
      else newSet.add(id); // Mantém selecionado se for clique simples
    } else {
      newSet.add(id);
    }
    setSelectedItems(newSet);
  };

  const selectAll = () => {
    const allIds = new Set();
    if (currentPath === "ROOT") {
      folders.forEach((f) => allIds.add(f.id));
      likedTracks.forEach((_, i) => allIds.add(`track-${i}`));
    } else {
      const folder = folders.find((f) => f.id === currentPath);
      if (folder) {
        folder.tracks.forEach((_, i) => allIds.add(`track-${i}`));
      }
    }
    setSelectedItems(allIds);
  };

  // --- MOUSE EVENTS PARA CAIXA DE SELEÇÃO ---
  const handleMouseDown = (e) => {
    // Apenas botão esquerdo e se o clique for no fundo (container)
    if (e.button !== 0) return;
    if (e.target !== containerRef.current) return;

    isDragging.current = true;
    const rect = containerRef.current.getBoundingClientRect();

    // Calcula posição inicial relativa ao scroll do container
    dragStart.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top + containerRef.current.scrollTop,
    };

    // Limpa seleção anterior se não estiver a usar teclas modificadoras
    if (!e.ctrlKey && !e.shiftKey) setSelectedItems(new Set());

    // Inicia caixa com tamanho 0
    setSelectionBox({
      x: dragStart.current.x,
      y: dragStart.current.y,
      width: 0,
      height: 0,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top + containerRef.current.scrollTop;

    // Matemática para desenhar o retângulo em qualquer direção (puxar para trás/cima)
    setSelectionBox({
      x: Math.min(currentX, dragStart.current.x),
      y: Math.min(currentY, dragStart.current.y),
      width: Math.abs(currentX - dragStart.current.x),
      height: Math.abs(currentY - dragStart.current.y),
    });
  };

  const handleMouseUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    // Lógica de Colisão AABB (Axis-Aligned Bounding Box)
    // Verifica quais ícones estão dentro da caixa de seleção final.
    if (selectionBox && selectionBox.width > 5) {
      const newSelection = new Set(selectedItems);
      // Seleciona elementos do DOM via atributo de dados (Performance hack)
      const itemElements = document.querySelectorAll("[data-selectable]");

      const boxRect = {
        left: selectionBox.x,
        top: selectionBox.y,
        right: selectionBox.x + selectionBox.width,
        bottom: selectionBox.y + selectionBox.height,
      };

      itemElements.forEach((el) => {
        const id = el.getAttribute("data-id");
        const elRectNative = el.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();

        // Normaliza coordenadas do elemento
        const elLeft = elRectNative.left - containerRect.left;
        const elTop =
          elRectNative.top - containerRect.top + containerRef.current.scrollTop;

        // Verifica Interseção
        if (
          elLeft < boxRect.right &&
          elLeft + elRectNative.width > boxRect.left &&
          elTop < boxRect.bottom &&
          elTop + elRectNative.height > boxRect.top
        ) {
          newSelection.add(id);
        }
      });
      setSelectedItems(newSelection);
    }
    setSelectionBox(null); // Remove a caixa visual
  };

  // =========================================================
  // 4. OPERAÇÕES DE FICHEIROS
  // =========================================================

  const handleContextMenu = (e, type, data) => {
    e.preventDefault();
    e.stopPropagation();

    // UX: Se clicar com botão direito num item não selecionado, seleciona-o.
    if (type === "ITEM" && !selectedItems.has(data)) {
      setSelectedItems(new Set([data]));
    }

    setContextMenu({
      visible: true,
      x: e.pageX,
      y: e.pageY,
      type: type === "BACKGROUND" ? "BACKGROUND" : "SELECTION",
      data: data,
    });
  };

  const handlePlayTrack = (track) => {
    openWindow("MEDIA_PLAYER", { trackToPlay: track });
  };

  const createNewFolder = () => {
    openWindow("INPUT_DIALOG", {
      title: "New Folder",
      message: "Folder Name:",
      onConfirm: async (name) => {
        if (name) {
          // Optimistic update podia ser feito aqui, mas reload é mais seguro para IDs
          await leaderboardApi.createFolder(currentUser, name);
          await loadData();
        }
      },
    });
  };

  // --- DELETE LOGIC ---
  const performBulkDelete = async () => {
    if (currentPath === "ROOT") {
      // Apagar itens na raiz (Pastas ou Likes)
      const foldersToDelete = [];
      const tracksToDelete = [];

      selectedItems.forEach((id) => {
        const isFolder = folders.some((f) => f.id === id);
        if (isFolder) foldersToDelete.push(id);
        else if (typeof id === "string" && id.startsWith("track-")) {
          const idx = parseInt(id.split("-")[1]);
          if (likedTracks[idx]) tracksToDelete.push(likedTracks[idx]);
        }
      });

      if (foldersToDelete.length === 0 && tracksToDelete.length === 0) return;

      await leaderboardApi.deleteItems(
        currentUser,
        foldersToDelete,
        tracksToDelete
      );
    } else {
      // Apagar itens DENTRO de uma pasta
      const folder = folders.find((f) => f.id === currentPath);
      if (!folder) return;

      const newTracks = folder.tracks.filter(
        (_, idx) => !selectedItems.has(`track-${idx}`)
      );

      const updatedFolders = folders.map((f) => {
        if (f.id === currentPath) return { ...f, tracks: newTracks };
        return f;
      });

      // API Call: Assume que existe uma forma de atualizar a estrutura de pastas
      await leaderboardApi.saveFolders(currentUser, updatedFolders);
    }

    await loadData();
    setSelectedItems(new Set());
  };

  const handleDeleteRequest = () => {
    setContextMenu({ ...contextMenu, visible: false });
    if (selectedItems.size === 0) return;
    openWindow("CONFIRM_DIALOG", {
      title: "Confirm Delete",
      message: `Are you sure you want to delete ${selectedItems.size} items?`,
      icon: "warning",
      onConfirm: performBulkDelete,
    });
  };

  // --- DRAG AND DROP (File Moving) ---
  const handleDragStart = (e, track) => {
    e.dataTransfer.setData("track", JSON.stringify(track));
    // Visual feedback handled by browser automatically
  };

  const handleDropOnFolder = async (e, folder) => {
    e.preventDefault();
    e.stopPropagation(); // Impede bubbling
    try {
      const trackData = JSON.parse(e.dataTransfer.getData("track"));
      await leaderboardApi.addTrackToFolder(currentUser, folder, trackData);
      loadData();
    } catch (err) {
      console.error("Invalid drop data");
    }
  };

  // =========================================================
  // 5. RENDERIZAÇÃO
  // =========================================================
  return (
    <div
      className="flex h-full font-sans text-xs select-none bg-white relative"
      // Eventos globais do container para permitir drag selection fluido
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
      {/* MENU DE CONTEXTO (Custom Right Click) */}
      {contextMenu.visible && (
        <div
          className="fixed z-[9999] bg-[#D4D0C8] border-2 border-white border-r-gray-600 border-b-gray-600 shadow-md py-1 min-w-[140px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()} // Previne fechar o menu ao clicar nele
        >
          {contextMenu.type === "BACKGROUND" ? (
            <>
              {currentPath === "ROOT" && (
                <div
                  className="px-4 py-1 hover:bg-[#000080] hover:text-white cursor-pointer flex gap-2"
                  onClick={createNewFolder}
                >
                  <img
                    src="https://win98icons.alexmeub.com/icons/png/directory_closed-4.png"
                    className="w-4 h-4"
                  />{" "}
                  <span>New Folder</span>
                </div>
              )}
              <div
                className="px-4 py-1 hover:bg-[#000080] hover:text-white cursor-pointer"
                onClick={selectAll}
              >
                Select All
              </div>
            </>
          ) : (
            <>
              <div className="px-4 py-1 font-bold text-gray-500 border-b border-gray-300 mb-1">
                {selectedItems.size} items selected
              </div>
              <div
                className="px-4 py-1 hover:bg-[#000080] hover:text-white cursor-pointer flex gap-2"
                onClick={handleDeleteRequest}
              >
                <span>🗑️ Delete</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* SIDEBAR (Windows XP Tasks Panel) */}
      <div className="w-48 bg-gradient-to-b from-[#7CA0DA] to-[#62799D] p-3 text-white hidden md:block overflow-y-auto z-20">
        <div className="mb-4">
          <h3 className="font-bold mb-2 cursor-default">
            File and Folder Tasks
          </h3>
          {currentPath === "ROOT" ? (
            <button
              onClick={createNewFolder}
              className="flex items-center gap-2 hover:underline cursor-pointer mb-1 text-left w-full"
            >
              <img
                src="https://win98icons.alexmeub.com/icons/png/directory_closed-4.png"
                className="w-4 h-4"
              />
              Make a new folder
            </button>
          ) : (
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
            <img src="/icons/MyComputer.ico" className="w-4 h-4" /> My Computer
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

      {/* ÁREA PRINCIPAL */}
      <div className="flex-grow flex flex-col bg-white relative h-full">
        {/* Address Bar */}
        <div className="p-1 border-b border-gray-300 bg-[#ECE9D8] flex gap-2 items-center shadow-sm relative z-20">
          <span className="text-gray-500 pl-1">Address:</span>
          <div className="bg-white border border-[#7F9DB9] px-2 py-0.5 w-full text-black shadow-inner truncate">
            My Documents\
            {currentPath === "ROOT"
              ? ""
              : folders.find((f) => f.id === currentPath)?.name}
          </div>
        </div>

        {/* Scroll Area / Drop Zone */}
        <div
          ref={containerRef}
          className="flex-grow p-4 overflow-auto bg-white relative"
          onMouseDown={handleMouseDown}
          onContextMenu={(e) => handleContextMenu(e, "BACKGROUND")}
        >
          {/* Caixa de Seleção Visual */}
          {selectionBox && (
            <div
              className="absolute bg-[#316AC5] border border-[#000080] opacity-40 pointer-events-none z-50"
              style={{
                left: selectionBox.x,
                top: selectionBox.y,
                width: selectionBox.width,
                height: selectionBox.height,
              }}
            />
          )}

          {/* GRID DE ÍCONES */}
          <div className="grid grid-cols-4 md:grid-cols-5 gap-4 content-start">
            {/* MODO: ROOT */}
            {currentPath === "ROOT" ? (
              <>
                {/* Pastas */}
                {folders.map((folder) => {
                  const isSelected = selectedItems.has(folder.id);
                  return (
                    <div
                      key={folder.id}
                      data-selectable="true"
                      data-id={folder.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelection(folder.id, e.ctrlKey);
                      }}
                      onDoubleClick={() => setCurrentPath(folder.id)}
                      onContextMenu={(e) =>
                        handleContextMenu(e, "ITEM", folder.id)
                      }
                      onDrop={(e) => handleDropOnFolder(e, folder)}
                      onDragOver={(e) => e.preventDefault()} // Necessário para permitir Drop
                      className={`flex flex-col items-center group w-24 cursor-pointer p-1 border ${
                        isSelected
                          ? "bg-[#316AC5] border-[#000080]"
                          : "border-transparent hover:bg-[#316AC5]/10"
                      } rounded-sm`}
                    >
                      <img
                        src="/icons/folder_closed.png"
                        className={`w-10 h-10 drop-shadow-sm ${
                          isSelected ? "opacity-80" : ""
                        }`}
                        onError={(e) =>
                          (e.target.src =
                            "https://win98icons.alexmeub.com/icons/png/directory_closed-4.png")
                        }
                      />
                      <span
                        className={`text-center mt-1 px-1 rounded w-full break-words text-[11px] leading-tight ${
                          isSelected
                            ? "text-white bg-[#316AC5]"
                            : "text-black group-hover:text-[#316AC5]"
                        }`}
                      >
                        {folder.name}
                      </span>
                    </div>
                  );
                })}

                {/* Músicas Soltas (Likes) */}
                {likedTracks.map((track, idx) => {
                  const trackId = `track-${idx}`;
                  const isSelected = selectedItems.has(trackId);
                  return (
                    <div
                      key={`${track.title}-${idx}`}
                      data-selectable="true"
                      data-id={trackId}
                      draggable
                      onDragStart={(e) => handleDragStart(e, track)}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelection(trackId, e.ctrlKey);
                      }}
                      onDoubleClick={() => handlePlayTrack(track)}
                      onContextMenu={(e) =>
                        handleContextMenu(e, "ITEM", trackId)
                      }
                      className={`flex flex-col items-center group w-24 cursor-pointer p-1 border ${
                        isSelected
                          ? "bg-[#316AC5] border-[#000080]"
                          : "border-transparent hover:bg-[#316AC5]/10"
                      } rounded-sm`}
                    >
                      <img
                        src="/icons/media_file.png"
                        className={`w-8 h-8 mb-1 drop-shadow-sm ${
                          isSelected ? "opacity-80" : ""
                        }`}
                        onError={(e) =>
                          (e.target.src =
                            "https://win98icons.alexmeub.com/icons/png/cd_audio_cd_a-0.png")
                        }
                      />
                      <span
                        className={`text-center mt-1 px-1 rounded line-clamp-2 text-[10px] w-full ${
                          isSelected
                            ? "text-white bg-[#316AC5]"
                            : "text-black group-hover:text-[#316AC5]"
                        }`}
                      >
                        {track.title}.mp3
                      </span>
                    </div>
                  );
                })}
              </>
            ) : (
              // MODO: DENTRO DE PASTA
              <>
                {/* Botão "Up One Level" */}
                <div
                  onDoubleClick={() => setCurrentPath("ROOT")}
                  className="flex flex-col items-center group w-20 cursor-pointer opacity-70 p-1"
                >
                  <img
                    src="https://win98icons.alexmeub.com/icons/png/directory_open_file_mydocs-4.png"
                    className="w-10 h-10"
                  />
                  <span className="text-center mt-1 text-[11px]">.. (Up)</span>
                </div>

                {/* Conteúdo da Pasta */}
                {folders
                  .find((f) => f.id === currentPath)
                  ?.tracks.map((track, idx) => {
                    const trackId = `track-${idx}`;
                    const isSelected = selectedItems.has(trackId);
                    return (
                      <div
                        key={idx}
                        data-selectable="true"
                        data-id={trackId}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelection(trackId, e.ctrlKey);
                        }}
                        onDoubleClick={() => handlePlayTrack(track)}
                        onContextMenu={(e) =>
                          handleContextMenu(e, "ITEM", trackId)
                        }
                        className={`flex flex-col items-center group w-24 cursor-pointer p-1 border ${
                          isSelected
                            ? "bg-[#316AC5] border-[#000080]"
                            : "border-transparent hover:bg-[#316AC5]/10"
                        } rounded-sm`}
                      >
                        <img
                          src="https://win98icons.alexmeub.com/icons/png/cd_audio_cd_a-0.png"
                          className={`w-8 h-8 mb-1 ${
                            isSelected ? "opacity-80" : ""
                          }`}
                        />
                        <span
                          className={`text-center mt-1 px-1 rounded line-clamp-2 text-[10px] w-full ${
                            isSelected
                              ? "text-white bg-[#316AC5]"
                              : "text-black group-hover:text-[#316AC5]"
                          }`}
                        >
                          {track.title}
                        </span>
                      </div>
                    );
                  })}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyDocumentsApp;
