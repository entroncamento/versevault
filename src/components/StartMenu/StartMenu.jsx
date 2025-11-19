import React, { useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useWindowManager } from "../../contexts/WindowManagerContext";

// Componente para itens da Esquerda (Branco)
const LeftMenuItem = ({ icon, title, subtitle, isBold = false, onClick }) => (
  <div
    className="group flex items-center px-2 py-1 hover:bg-xp-start-highlight hover:text-white cursor-default mb-1"
    onClick={onClick}
  >
    <div className="w-8 h-8 mr-2 flex items-center justify-center">
      {typeof icon === "string" ? (
        <img src={icon} alt="" className="w-full h-full object-contain" />
      ) : (
        <div className="w-full h-full bg-gray-400 rounded-sm" />
      )}
    </div>
    <div className="flex flex-col">
      <span className={`text-xs ${isBold ? "font-bold" : "font-normal"}`}>
        {title}
      </span>
      {subtitle && (
        <span className="text-[10px] text-gray-500 group-hover:text-gray-200">
          {subtitle}
        </span>
      )}
    </div>
  </div>
);

// Componente para itens da Direita (Azul Claro)
const RightMenuItem = ({ icon, title, isBold = false, onClick }) => (
  <div
    className="group flex items-center px-2 py-1 hover:bg-xp-start-highlight hover:text-white cursor-default mb-1"
    onClick={onClick}
  >
    <div className="w-6 h-6 mr-2 flex items-center justify-center">
      {typeof icon === "string" && icon !== "" ? (
        <img src={icon} alt="" className="w-full h-full object-contain" />
      ) : (
        <div className="w-4 h-4 bg-blue-800/20 rounded-sm flex items-center justify-center text-blue-900 text-[9px] font-bold">
          ?
        </div>
      )}
    </div>
    <span
      className={`text-xs text-gray-800 group-hover:text-white ${
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        if (event.target.closest("#start-button")) return;
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleEditProfile = () => {
    console.log("Abrir página de editar perfil");
  };

  // Funções para abrir as Apps
  const openQuiz = () => {
    openWindow("QUIZ");
    onClose();
  };
  const openLeaderboard = () => {
    openWindow("LEADERBOARD");
    onClose();
  };
  const openComputer = () => {
    openWindow("MY_COMPUTER");
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="absolute bottom-[30px] left-0 z-[2000] font-sans select-none"
    >
      <div className="w-[380px] rounded-t-lg overflow-hidden shadow-xp-start-menu border-2 border-xp-start-border bg-white flex flex-col">
        {/* --- HEADER --- */}
        <div className="h-14 bg-gradient-to-b from-xp-start-header-start to-xp-start-header-end flex items-center px-2 border-b-2 border-orange-400 shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-white/30" />

          <div className="w-10 h-10 bg-white rounded border-2 border-white/60 shadow-sm overflow-hidden mr-3 flex-shrink-0">
            <img
              src={userPhoto}
              className="w-full h-full object-cover"
              alt="User"
            />
          </div>

          <span
            className="text-white font-bold text-lg drop-shadow-md truncate"
            style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}
          >
            {displayName}
          </span>
        </div>

        {/* --- BODY (Colunas) --- */}
        <div className="flex h-[380px]">
          {/* ESQUERDA (Apps na ordem do Desktop) */}
          <div className="flex-1 bg-white flex flex-col py-2 pl-1 pr-1">
            {/* 1. My Computer */}
            <LeftMenuItem
              title="My Computer"
              isBold
              icon="/icons/MyComputer.ico"
              onClick={openComputer}
            />

            {/* 2. VerseVault Quiz */}
            <LeftMenuItem
              title="VerseVault Quiz"
              isBold
              icon="/icons/Minesweeper.ico"
              onClick={openQuiz}
            />

            {/* 3. Leaderboard */}
            <LeftMenuItem
              title="Leaderboard"
              isBold
              icon="/icons/notepad.png"
              onClick={openLeaderboard}
            />

            <div className="flex-grow" />
          </div>

          {/* DIREITA (Sistema / User - LIMPO) */}
          <div className="flex-1 bg-xp-start-right-bg border-l border-xp-start-right-border py-2 pl-1 pr-1">
            {/* Apenas Edit Profile */}
            <RightMenuItem
              title="Edit Profile"
              isBold
              icon="/icons/notepad.png"
              onClick={handleEditProfile}
            />

            <div className="flex-grow" />
          </div>
        </div>

        {/* --- FOOTER --- */}
        <div className="h-10 bg-gradient-to-b from-xp-start-footer-start to-xp-start-footer-end flex items-center justify-end px-3 border-t border-xp-start-border">
          <button
            onClick={logout}
            className="flex items-center px-2 py-1 hover:bg-xp-start-orange-hover hover:shadow-inner text-white text-xs mr-2 rounded-sm transition-colors"
          >
            <span className="bg-[#E59700] p-0.5 border border-white/40 mr-1 rounded-[2px]">
              🗝️
            </span>
            Log Off
          </button>

          <button className="flex items-center px-2 py-1 hover:bg-xp-start-orange-hover hover:shadow-inner text-white text-xs rounded-sm transition-colors">
            <span className="bg-[#D6382D] p-0.5 border border-white/40 mr-1 rounded-[2px] text-[9px]">
              ⏻
            </span>
            Turn Off Computer
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartMenu;
