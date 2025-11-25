import React, { useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useWindowManager } from "../../contexts/WindowManagerContext";

// --- ITEM DA ESQUERDA (Fundo Branco) ---
const LeftMenuItem = ({ icon, title, subtitle, isBold = false, onClick }) => (
  <div
    className="group flex items-center px-2 py-1 hover:bg-xp-start-hover hover:text-white cursor-default mb-1 mx-1 rounded-[3px]"
    onClick={onClick}
  >
    <div className="w-8 h-8 mr-2 flex items-center justify-center flex-shrink-0">
      {typeof icon === "string" ? (
        <img
          src={icon}
          alt=""
          className="w-full h-full object-contain drop-shadow-sm"
        />
      ) : (
        <div className="w-full h-full bg-gray-400 rounded-sm" />
      )}
    </div>
    <div className="flex flex-col overflow-hidden">
      <span
        className={`text-xs truncate ${
          isBold ? "font-bold text-gray-800" : "font-normal text-gray-700"
        } group-hover:text-white`}
      >
        {title}
      </span>
      {subtitle && (
        <span className="text-[10px] text-gray-500 group-hover:text-gray-200 truncate">
          {subtitle}
        </span>
      )}
    </div>
  </div>
);

// --- ITEM DA DIREITA (Fundo Azul) ---
const RightMenuItem = ({ icon, title, isBold = false, onClick }) => (
  <div
    className="group flex items-center px-3 py-1 hover:bg-xp-start-hover hover:text-white cursor-default mb-1"
    onClick={onClick}
  >
    <div className="w-6 h-6 mr-3 flex items-center justify-center flex-shrink-0">
      {typeof icon === "string" && icon !== "" ? (
        <img src={icon} alt="" className="w-full h-full object-contain" />
      ) : (
        <div className="w-full h-full bg-blue-200 border border-blue-400 rounded-sm" />
      )}
    </div>
    <span
      className={`text-xs text-[#00138c] group-hover:text-white leading-none ${
        isBold ? "font-bold" : ""
      }`}
    >
      {title}
    </span>
  </div>
);

const StartMenu = ({ onClose }) => {
  const { currentUser, logout } = useAuth();
  const { openWindow } = useWindowManager();
  const menuRef = useRef(null);

  const displayName =
    currentUser?.displayName ||
    currentUser?.email?.split("@")[0] ||
    "Administrator";
  const userPhoto = currentUser?.photoURL || "/icons/Minesweeper.ico";

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        if (event.target.closest("#start-button")) return;
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleEditProfile = () => {
    console.log("Abrir página de editar perfil");
    onClose();
  };

  // Funções auxiliares para abrir Apps
  const handleOpenApp = (appKey) => {
    openWindow(appKey);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="absolute bottom-[30px] left-0 z-[9999] font-sans select-none animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      {/* Container Principal com Cores do Config */}
      <div className="w-[380px] h-[420px] rounded-t-lg bg-xp-start-border p-[2px] pr-[3px] pb-0 shadow-xp-start flex flex-col">
        {/* --- HEADER --- */}
        <div className="h-16 bg-xp-header-gradient rounded-t-[5px] relative flex items-center px-2 shadow-[inset_0px_1px_2px_rgba(255,255,255,0.5)] overflow-hidden">
          {/* Linha de brilho no topo */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-white/40" />

          {/* Foto do User */}
          <div className="w-12 h-12 bg-xp-start-bodyRight rounded-[3px] border-[2px] border-white shadow-sm ml-1 mr-3 overflow-hidden flex-shrink-0">
            <img
              src={userPhoto}
              className="w-full h-full object-cover"
              alt="User"
            />
          </div>

          {/* Nome do User */}
          <span
            className="text-white font-bold text-[15px] truncate tracking-wide"
            style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.6)" }}
          >
            {displayName}
          </span>

          {/* Faixa Laranja */}
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-xp-start-orange shadow-[0_-1px_0_rgba(0,0,0,0.1)]" />
        </div>

        {/* --- CORPO --- */}
        <div className="flex flex-1 bg-white">
          {/* ESQUERDA (Seus itens originais) */}
          <div className="flex-[5] bg-xp-start-bodyLeft flex flex-col py-2 border-r border-xp-start-bodyRight">
            <LeftMenuItem
              title="My Computer"
              isBold
              icon="/icons/MyComputer.ico"
              onClick={() => handleOpenApp("MY_COMPUTER")}
            />

            <LeftMenuItem
              title="VerseVault Quiz"
              isBold
              icon="/icons/Minesweeper.ico"
              onClick={() => handleOpenApp("QUIZ")}
            />

            <LeftMenuItem
              title="Leaderboard"
              isBold
              icon="/icons/notepad.png"
              onClick={() => handleOpenApp("LEADERBOARD")}
            />

            <div className="flex-grow" />
          </div>

          {/* DIREITA (Seus itens originais) */}
          <div className="flex-[4] bg-xp-start-bodyRight py-2 px-1">
            <RightMenuItem
              title="Edit Profile"
              isBold
              icon="/icons/notepad.png"
              onClick={() => handleOpenApp("USER_ACCOUNTS")}
            />

            {/* Espaço vazio para manter o layout consistente se quiseres adicionar mais tarde */}
            <div className="flex-grow" />
          </div>
        </div>

        {/* --- FOOTER --- */}
        <div className="h-10 bg-xp-start-footer flex items-center justify-end px-3 pt-[1px] border-t border-white/30 shadow-[inset_0_2px_2px_rgba(0,0,0,0.1)]">
          <button
            onClick={logout}
            className="flex items-center px-2 py-1 mr-2 hover:bg-xp-start-hover hover:shadow-inner rounded-[3px] transition-all group"
          >
            <div className="bg-[#E59700] p-[2px] rounded-[2px] shadow-sm border border-white/40 mr-1.5 text-white">
              <span className="text-[10px] leading-none">🗝️</span>
            </div>
            <span className="text-white text-[11px] drop-shadow-md font-normal">
              Log Off
            </span>
          </button>

          <button
            onClick={() => window.location.reload()} // Simula restart
            className="flex items-center px-2 py-1 hover:bg-xp-start-hover hover:shadow-inner rounded-[3px] transition-all group"
          >
            <div className="bg-[#D6382D] p-[2px] rounded-[2px] shadow-sm border border-white/40 mr-1.5 text-white">
              <span className="text-[10px] leading-none">⏻</span>
            </div>
            <span className="text-white text-[11px] drop-shadow-md font-normal">
              Turn Off Computer
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartMenu;
