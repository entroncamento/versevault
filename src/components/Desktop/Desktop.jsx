import React, { useState } from "react";
import { useWindowManager } from "../../contexts/WindowManagerContext.jsx";
import Window from "../WindowSystem/Window.jsx";
import Icon from "./Icon.jsx";

// Importação de Assets (Vite trata isto como URLs estáticas)
import blissWallpaper from "/bliss.jpg";
import computerIcon from "/icons/MyComputer.ico";
import quizIcon from "/icons/Minesweeper.ico";
import leaderboardIcon from "/icons/notepad.png";
import dailyDropIcon from "/icons/search.png";
import wmpIconUrl from "/icons/wmpIcon.png";
import mydocsIcon from "/icons/MyDocuments.png";

// =========================================================
// CONFIGURAÇÃO INICIAL (GRID DO DESKTOP)
// =========================================================
// Definimos o estado inicial fora do componente para evitar recriação desnecessária.
// As coordenadas (x, y) simulam um sistema de grelha invisível (Grid Layout).
const INITIAL_ICONS = [
  {
    id: "mydocs",
    label: "My Documents",
    icon: mydocsIcon,
    action: "MY_DOCUMENTS", // ID que o WindowManager reconhece
    position: { x: 20, y: 20 }, // Slot 1
  },
  {
    id: "computer",
    label: "My Computer",
    icon: computerIcon,
    action: "MY_COMPUTER",
    position: { x: 20, y: 110 }, // Slot 2 (+90px Y)
  },
  {
    id: "quiz",
    label: "VerseVault Quiz",
    icon: quizIcon,
    action: "QUIZ",
    position: { x: 20, y: 200 }, // Slot 3
  },
  {
    id: "leaderboard",
    label: "High Scores",
    icon: leaderboardIcon,
    action: "LEADERBOARD",
    position: { x: 20, y: 290 }, // Slot 4
  },
  {
    id: "dailydrop",
    label: "Daily Drop",
    icon: dailyDropIcon,
    action: "DAILY_DROP",
    position: { x: 20, y: 380 }, // Slot 5
  },
  {
    id: "mediaplayer",
    label: "Media Player",
    icon: wmpIconUrl,
    action: "MEDIA_PLAYER",
    position: { x: 20, y: 470 }, // Slot 6
  },
];

/**
 * Componente Desktop (Workspace Principal).
 * Responsável por renderizar o Wallpaper, os Ícones e a Camada de Janelas.
 */
const Desktop = () => {
  // Consome o contexto global de janelas para saber o que desenhar
  const { windows, openWindow } = useWindowManager();

  // State local para gestão de ícones (Seleção e Posição Drag & Drop)
  const [selectedIconId, setSelectedIconId] = useState(null);
  const [icons, setIcons] = useState(INITIAL_ICONS);

  // =========================================================
  // HANDLERS (Interação do Utilizador)
  // =========================================================

  // Atualiza a posição do ícone após o Drag & Drop.
  // Usa "Functional State Update" para garantir imutabilidade e dados frescos.
  const moveIcon = (id, newPos) => {
    setIcons((prevIcons) =>
      prevIcons.map((icon) =>
        icon.id === id ? { ...icon, position: newPos } : icon
      )
    );
  };

  // Limpa a seleção ao clicar no espaço vazio (Comportamento padrão de OS)
  const handleBackgroundMouseDown = (e) => {
    // Verifica se o clique foi direto no Desktop e não num filho (embora o z-index ajude)
    if (e.target === e.currentTarget) {
      setSelectedIconId(null);
    }
  };

  return (
    <div
      className="w-full h-full bg-cover bg-center relative overflow-hidden select-none"
      style={{ backgroundImage: `url(${blissWallpaper})` }}
      onMouseDown={handleBackgroundMouseDown} // Captura clique para desmarcar ícones
      // Desativa o menu de contexto nativo do browser no desktop para imersão
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* CAMADA 1: ÍCONES */}
      {/* Renderizados primeiro para ficarem "atrás" das janelas (Z-Index implícito) */}
      {icons.map((iconData) => (
        <Icon
          key={iconData.id}
          id={iconData.id}
          label={iconData.label}
          icon={iconData.icon}
          position={iconData.position}
          // Lógica de Seleção: Passada via props para o componente Icon
          isSelected={selectedIconId === iconData.id}
          onSelect={setSelectedIconId}
          onMove={moveIcon}
          // Ação de Duplo Clique: Dispara a abertura da aplicação
          onDoubleClick={() => openWindow(iconData.action)}
        />
      ))}

      {/* CAMADA 2: JANELAS (Window Manager Layer) */}
      {/* Renderizamos apenas janelas que não estão minimizadas (Optimization) */}
      {windows
        .filter((w) => !w.isMinimized)
        .map((window) => (
          <Window
            key={window.id}
            {...window} // Spread operator passa todas as props (title, size, content...)
          />
        ))}
    </div>
  );
};

export default Desktop;
