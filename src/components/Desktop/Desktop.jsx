import React, { useState } from "react";
import { useWindowManager } from "../../contexts/WindowManagerContext.jsx";
import Window from "../WindowSystem/Window.jsx";
import Icon from "./Icon.jsx";

// Importa os assets da pasta 'public'
import blissWallpaper from "/bliss.jpg";
import computerIcon from "/icons/MyComputer.ico";
import quizIcon from "/icons/Minesweeper.ico";
import leaderboardIcon from "/icons/notepad.png";
import dailyDropIcon from "/icons/search.png"; // Novo ícone
import wmpIconUrl from "/icons/wmpIcon.png"; // Novo ícone
import mydocsIcon from "/icons/MyDocuments.png";

const Desktop = () => {
  const { windows, openWindow } = useWindowManager();

  const [selectedIconId, setSelectedIconId] = useState(null);

  const [icons, setIcons] = useState([
    // 1. My Computer
    {
      id: "computer",
      label: "My Computer",
      icon: computerIcon,
      action: "MY_COMPUTER",
      position: { x: 20, y: 20 },
    },
    // 2. VerseVault Quiz
    {
      id: "quiz",
      label: "VerseVault Quiz",
      icon: quizIcon,
      action: "QUIZ",
      position: { x: 20, y: 110 },
    },
    // 3. Leaderboard
    {
      id: "leaderboard",
      label: "High Scores",
      icon: leaderboardIcon,
      action: "LEADERBOARD",
      position: { x: 20, y: 200 },
    },
    // 4. Daily Drop (NOVO)
    {
      id: "dailydrop",
      label: "Daily Drop",
      icon: dailyDropIcon,
      action: "DAILY_DROP",
      position: { x: 20, y: 290 },
    },
    {
      id: "mediaplayer",
      label: "Media Player",
      icon: wmpIconUrl, // Usa a variável criada acima
      action: "MEDIA_PLAYER",
      position: { x: 20, y: 380 },
    },
    {
      id: "mydocs",
      label: "My Documents",
      icon: mydocsIcon,
      action: "MY_DOCUMENTS",
      position: { x: 20, y: 20 }, // Move o "My Computer" para baixo ou ajusta as posições
    },
  ]);

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
      onMouseDown={() => setSelectedIconId(null)}
    >
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

      {windows
        .filter((w) => !w.isMinimized)
        .map((window) => (
          <Window key={window.id} {...window} />
        ))}
    </div>
  );
};

export default Desktop;
