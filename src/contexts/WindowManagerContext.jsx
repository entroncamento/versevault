import React, { createContext, useState, useContext, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

import QuizApp from "../apps/QuizApp.jsx";
import MyComputer from "../apps/MyComputer.jsx";
import LeaderboardApp from "../apps/LeaderboardApp.jsx";
import UserAccountsApp from "../apps/UserAccountsApp.jsx";
import DailyDropApp from "../apps/DailyDropApp.jsx";
import MediaPlayerApp from "../apps/MediaPlayerApp.jsx";

const appRegistry = {
  QUIZ: {
    component: QuizApp,
    title: "VerseVault Quiz",
    icon: "/icons/Minesweeper.ico",
  },
  MY_COMPUTER: {
    component: MyComputer,
    title: "My Computer",
    icon: "/icons/MyComputer.ico",
  },
  LEADERBOARD: {
    component: LeaderboardApp,
    title: "Leaderboard",
    icon: "/icons/notepad.png",
  },
  USER_ACCOUNTS: {
    component: UserAccountsApp,
    title: "User Accounts",
    icon: "/icons/user.png",
  },
  DAILY_DROP: {
    // NOVO REGISTO
    component: DailyDropApp,
    title: "Daily Drop Challenge",
    icon: "/icons/search.png",
  },
  MEDIA_PLAYER: {
    component: MediaPlayerApp,
    title: "Windows Media Player",
    icon: "/icons/wmpIcon.png", // Vê a nota sobre o ícone abaixo
  },
};

const WindowManagerContext = createContext();

export const WindowManagerProvider = ({ children }) => {
  const [windows, setWindows] = useState([]);
  const [highestZIndex, setHighestZIndex] = useState(10);

  const openWindow = useCallback(
    (appKey, data = {}) => {
      const appConfig = appRegistry[appKey];
      if (!appConfig) return;

      const newZIndex = highestZIndex + 1;
      setHighestZIndex(newZIndex);

      // Definir tamanhos personalizados
      let windowSize = { width: 640, height: 480 }; // Padrão

      if (appKey === "LEADERBOARD") {
        windowSize = { width: 600, height: 500 };
      } else if (appKey === "DAILY_DROP") {
        windowSize = { width: 400, height: 550 }; // Tamanho para o Daily Drop
      }

      const newWindow = {
        id: uuidv4(),
        appKey,
        title: appConfig.title,
        content: appConfig.component,
        icon: appConfig.icon,
        zIndex: newZIndex,
        isMinimized: false,
        isMaximized: false,
        position: {
          x: 50 + Math.random() * 50,
          y: 50 + Math.random() * 50,
        },
        size: windowSize,
        props: data,
      };

      setWindows((prevWindows) => [...prevWindows, newWindow]);
    },
    [highestZIndex]
  );

  const closeWindow = useCallback((id) => {
    setWindows((prevWindows) => prevWindows.filter((w) => w.id !== id));
  }, []);

  const minimizeWindow = useCallback((id) => {
    setWindows((prevWindows) =>
      prevWindows.map((w) => (w.id === id ? { ...w, isMinimized: true } : w))
    );
  }, []);

  const restoreWindow = useCallback(
    (id) => {
      const newZIndex = highestZIndex + 1;
      setHighestZIndex(newZIndex);

      setWindows((prevWindows) =>
        prevWindows.map((w) =>
          w.id === id ? { ...w, isMinimized: false, zIndex: newZIndex } : w
        )
      );
    },
    [highestZIndex]
  );

  const focusWindow = useCallback(
    (id) => {
      const windowToFocus = windows.find((w) => w.id === id);
      if (!windowToFocus || windowToFocus.zIndex === highestZIndex) return;

      const newZIndex = highestZIndex + 1;
      setHighestZIndex(newZIndex);

      setWindows((prevWindows) =>
        prevWindows.map((w) => (w.id === id ? { ...w, zIndex: newZIndex } : w))
      );
    },
    [windows, highestZIndex]
  );

  const toggleMaximizeWindow = useCallback((id) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isMaximized: !w.isMaximized } : w))
    );
  }, []);

  const updateWindowPosition = useCallback((id, newPosition) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, position: newPosition } : w))
    );
  }, []);

  const value = {
    windows,
    openWindow,
    closeWindow,
    minimizeWindow,
    restoreWindow,
    focusWindow,
    toggleMaximizeWindow,
    updateWindowPosition,
    appRegistry,
  };

  return (
    <WindowManagerContext.Provider value={value}>
      {children}
    </WindowManagerContext.Provider>
  );
};

export const useWindowManager = () => {
  const context = useContext(WindowManagerContext);
  if (!context) {
    throw new Error(
      "useWindowManager must be used within a WindowManagerProvider"
    );
  }
  return context;
};
