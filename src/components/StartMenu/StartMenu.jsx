import React, { useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useWindowManager } from "../../contexts/WindowManagerContext";

// =========================================================
// SUB-COMPONENTES (Menu Items)
// =========================================================
/**
 * Item da coluna esquerda (Apps Pinned/Frequent).
 * Ícone Grande (32x32) + Texto descritivo.
 */
const LeftMenuItem = ({ icon, title, subtitle, isBold = false, onClick }) => (
  <div
    className="group flex items-center px-2 py-1 hover:bg-xp-start-hover hover:text-white cursor-default mb-1 mx-1 rounded-[3px] transition-colors"
    onClick={onClick}
  >
    <div className="w-8 h-8 mr-2 flex items-center justify-center flex-shrink-0">
      {typeof icon === "string" ? (
        <img
          src={icon}
          alt=""
          className="w-full h-full object-contain drop-shadow-sm"
          // Evita ícones quebrados
          onError={(e) => {
            e.target.style.display = "none";
          }}
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

/**
 * Item da coluna direita (System Folders).
 * Ícone Pequeno (24x24) + Texto simples.
 */
const RightMenuItem = ({ icon, title, subtitle, isBold = false, onClick }) => (
  <div
    className="group flex items-center px-3 py-1 hover:bg-xp-start-hover hover:text-white cursor-default mb-1 transition-colors"
    onClick={onClick}
  >
    <div className="w-6 h-6 mr-3 flex items-center justify-center flex-shrink-0">
      {typeof icon === "string" && icon !== "" ? (
        <img src={icon} alt="" className="w-full h-full object-contain" />
      ) : (
        <div className="w-full h-full bg-blue-200 border border-blue-400 rounded-sm" />
      )}
    </div>
    <div className="flex flex-col overflow-hidden">
      <span
        className={`text-xs text-[#00138c] group-hover:text-white leading-none ${
          isBold ? "font-bold" : ""
        }`}
      >
        {title}
      </span>
      {subtitle && (
        <span className="text-[10px] text-[#00138c] opacity-80 group-hover:text-gray-200 group-hover:opacity-100 truncate mt-[1px]">
          {subtitle}
        </span>
      )}
    </div>
  </div>
);

// =========================================================
// COMPONENTE PRINCIPAL
// =========================================================
const StartMenu = ({ onClose }) => {
  const { currentUser, logout } = useAuth();
  const { openWindow } = useWindowManager();

  // Ref para detetar cliques fora do menu
  const menuRef = useRef(null);

  // Fallbacks para dados do utilizador
  const displayName =
    currentUser?.displayName ||
    currentUser?.email?.split("@")[0] ||
    "Administrator";
  const userPhoto = currentUser?.photoURL || "/icons/Minesweeper.ico";

  // --- CLICK OUTSIDE HANDLER ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Se clicar fora do menu E não for no botão Iniciar (que já tem o seu toggle)
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        if (event.target.closest("#start-button")) return;
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Handler unificado para abrir apps e fechar menu
  const handleOpenApp = (appKey) => {
    openWindow(appKey);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="absolute bottom-[30px] left-0 z-[9999] font-sans select-none animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      {/* Container Principal com Borda Azul Arredondada (Topo) */}
      <div className="w-[380px] h-[420px] rounded-t-lg bg-xp-start-border p-[2px] pr-[3px] pb-0 shadow-xp-start flex flex-col">
        {/* HEADER: Foto e Nome do Utilizador */}
        <div className="h-16 bg-xp-header-gradient rounded-t-[5px] relative flex items-center px-2 shadow-[inset_0px_1px_2px_rgba(255,255,255,0.5)] overflow-hidden">
          {/* Brilho Superior */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-white/40" />

          <div className="w-12 h-12 bg-xp-start-bodyRight rounded-[3px] border-[2px] border-white shadow-sm ml-1 mr-3 overflow-hidden flex-shrink-0">
            <img
              src={userPhoto}
              className="w-full h-full object-cover"
              alt="User"
              onError={(e) => {
                e.target.src = "/icons/user.png";
              }}
            />
          </div>
          <span
            className="text-white font-bold text-[15px] truncate tracking-wide"
            style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.6)" }}
          >
            {displayName}
          </span>
          {/* Linha Laranja Inferior */}
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-xp-start-orange shadow-[0_-1px_0_rgba(0,0,0,0.1)]" />
        </div>

        {/* CORPO DO MENU (Colunas) */}
        <div className="flex flex-1 bg-white">
          {/* ESQUERDA (Branco): Apps Principais */}
          <div className="flex-[5] bg-xp-start-bodyLeft flex flex-col py-2 border-r border-xp-start-bodyRight">
            <LeftMenuItem
              title="My Computer"
              subtitle="System overview"
              icon="/icons/MyComputer.ico"
              onClick={() => handleOpenApp("MY_COMPUTER")}
            />

            {/* Separador Visual (Opcional, mas comum no XP) */}
            <div className="w-[90%] h-[1px] bg-gray-200 mx-auto my-1" />

            <LeftMenuItem
              title="VerseVault Quiz"
              subtitle="Test your music knowledge"
              icon="/icons/Minesweeper.ico"
              isBold // Destaque para a app principal
              onClick={() => handleOpenApp("QUIZ")}
            />

            <LeftMenuItem
              title="Leaderboard"
              subtitle="See top players"
              icon="/icons/notepad.png"
              onClick={() => handleOpenApp("LEADERBOARD")}
            />

            <LeftMenuItem
              title="Daily Drop"
              subtitle="New challenge everyday"
              icon="/icons/search.png"
              onClick={() => handleOpenApp("DAILY_DROP")}
            />

            <LeftMenuItem
              title="VerseVault Media Player"
              subtitle="Play and discover music"
              icon="/icons/wmpIcon.png"
              onClick={() => handleOpenApp("MEDIA_PLAYER")}
            />

            <div className="flex-grow" />
          </div>

          {/* DIREITA (Azul Claro): Pastas de Sistema */}
          <div className="flex-[4] bg-xp-start-bodyRight py-2 px-1">
            <RightMenuItem
              title="My Documents"
              isBold
              icon="/icons/MyDocuments.png"
              onClick={() => handleOpenApp("MY_DOCUMENTS")}
            />

            <RightMenuItem
              title="Edit Profile"
              subtitle="Change avatar & name"
              icon="/icons/notepad.png"
              onClick={() => handleOpenApp("USER_ACCOUNTS")}
            />

            <div className="flex-grow" />
          </div>
        </div>

        {/* FOOTER: Logoff / Shutdown */}
        <div className="h-10 bg-xp-start-footer flex items-center justify-end px-3 pt-[1px] border-t border-white/30 shadow-[inset_0_2px_2px_rgba(0,0,0,0.1)] rounded-b-sm">
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
            onClick={() => window.location.reload()}
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
