import React, { useState } from "react";
import { useWindowManager } from "../../contexts/WindowManagerContext.jsx";
import Window from "../WindowSystem/Window.jsx";
import Icon from "./Icon.jsx";

// Importa os assets da pasta 'public'
import blissWallpaper from "/bliss.jpg";
import computerIcon from "/icons/MyComputer.ico";
import quizIcon from "/icons/Minesweeper.ico";
import leaderboardIcon from "/icons/notepad.png";
import dailyDropIcon from "/icons/search.png";
import wmpIconUrl from "/icons/wmpIcon.png";
import mydocsIcon from "/icons/MyDocuments.png";

const Desktop = () => {
  const { windows, openWindow } = useWindowManager();

  const [selectedIconId, setSelectedIconId] = useState(null);

  // Ordem lógica sugerida:
  // 1. My Documents (Topo)
  // 2. My Computer
  // 3. Apps principais (Quiz, Leaderboard, Daily Drop, Media Player)
  const [icons, setIcons] = useState([
    {
      id: "mydocs",
      label: "My Documents",
      icon: mydocsIcon,
      action: "MY_DOCUMENTS",
      position: { x: 20, y: 20 }, // Posição 1
    },
    {
      id: "computer",
      label: "My Computer",
      icon: computerIcon,
      action: "MY_COMPUTER",
      position: { x: 20, y: 110 }, // Posição 2
    },
    {
      id: "quiz",
      label: "VerseVault Quiz",
      icon: quizIcon,
      action: "QUIZ",
      position: { x: 20, y: 200 }, // Posição 3
    },
    {
      id: "leaderboard",
      label: "High Scores",
      icon: leaderboardIcon,
      action: "LEADERBOARD",
      position: { x: 20, y: 290 }, // Posição 4
    },
    {
      id: "dailydrop",
      label: "Daily Drop",
      icon: dailyDropIcon,
      action: "DAILY_DROP",
      position: { x: 20, y: 380 }, // Posição 5
    },
    {
      id: "mediaplayer",
      label: "Media Player",
      icon: wmpIconUrl,
      action: "MEDIA_PLAYER",
      position: { x: 20, y: 470 }, // Posição 6
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
