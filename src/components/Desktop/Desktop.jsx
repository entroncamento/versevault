import React, { useState } from "react";
import { useWindowManager } from "../../contexts/WindowManagerContext.jsx";
import Window from "../WindowSystem/Window.jsx";
import Icon from "./Icon.jsx";

// Importa os assets da pasta 'public'
import blissWallpaper from "/bliss.jpg";
import computerIcon from "/icons/MyComputer.ico";
import quizIcon from "/icons/Minesweeper.ico";
import leaderboardIcon from "/icons/notepad.png"; // Podes mudar para um ícone de troféu se tiveres

const Desktop = () => {
  const { windows, openWindow } = useWindowManager();

  // Estado para gerir a seleção de ícones (clicar fora desmarca)
  const [selectedIconId, setSelectedIconId] = useState(null);

  // Estado para gerir os ícones e as suas posições
  const [icons, setIcons] = useState([
    // 1. My Computer (Topo)
    {
      id: "computer",
      label: "My Computer",
      icon: computerIcon,
      action: "MY_COMPUTER",
      position: { x: 20, y: 20 }, // Posição inicial (Coluna 1, Linha 1)
    },
    // 2. VerseVault Quiz (Meio)
    {
      id: "quiz",
      label: "VerseVault Quiz",
      icon: quizIcon,
      action: "QUIZ",
      position: { x: 20, y: 110 }, // Posição inicial (Coluna 1, Linha 2)
    },
    // 3. Leaderboard (Fundo)
    {
      id: "leaderboard",
      label: "High Scores", // Ou Leaderboard
      icon: leaderboardIcon,
      action: "LEADERBOARD",
      position: { x: 20, y: 200 }, // Posição inicial (Coluna 1, Linha 3)
    },
  ]);

  // Função para atualizar a posição de um ícone específico
  const moveIcon = (id, newPos) => {
    setIcons((prevIcons) =>
      prevIcons.map((icon) =>
        icon.id === id ? { ...icon, position: newPos } : icon
      )
    );
  };

  return (
    <div
      className="w-full h-full bg-cover bg-center relative overflow-hidden"
      style={{ backgroundImage: `url(${blissWallpaper})` }}
      // Clicar no fundo do desktop desmarca o ícone selecionado
      onMouseDown={() => setSelectedIconId(null)}
    >
      {/* Renderizar Ícones */}
      {icons.map((iconData) => (
        <Icon
          key={iconData.id}
          id={iconData.id}
          label={iconData.label}
          icon={iconData.icon}
          position={iconData.position}
          isSelected={selectedIconId === iconData.id}
          onSelect={setSelectedIconId}
          onMove={moveIcon}
          onDoubleClick={() => openWindow(iconData.action)}
        />
      ))}

      {/* Renderizar Janelas */}
      {windows
        .filter((w) => !w.isMinimized)
        .map((window) => (
          <Window key={window.id} {...window} />
        ))}
    </div>
  );
};

export default Desktop;
