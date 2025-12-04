import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  Suspense,
} from "react";
import { v4 as uuidv4 } from "uuid";

// Importações Lazy
const QuizApp = React.lazy(() => import("../apps/QuizApp.jsx"));
const MyComputer = React.lazy(() => import("../apps/MyComputer.jsx"));
const LeaderboardApp = React.lazy(() => import("../apps/LeaderboardApp.jsx"));
const UserAccountsApp = React.lazy(() => import("../apps/UserAccountsApp.jsx"));
const DailyDropApp = React.lazy(() => import("../apps/DailyDropApp.jsx"));
const MediaPlayerApp = React.lazy(() => import("../apps/MediaPlayerApp.jsx"));
const MyDocumentsApp = React.lazy(() => import("../apps/MyDocumentsApp.jsx"));
const ConfirmDialogApp = React.lazy(() =>
  import("../apps/ConfirmDialogApp.jsx")
);
// ADICIONADO: Importar Input Dialog
const InputDialogApp = React.lazy(() => import("../apps/InputDialogApp.jsx"));

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
    component: DailyDropApp,
    title: "Daily Drop Challenge",
    icon: "/icons/search.png",
  },
  MEDIA_PLAYER: {
    component: MediaPlayerApp,
    title: "VerseVault Media Player",
    icon: "/icons/wmpIcon.png",
  },
  MY_DOCUMENTS: {
    component: MyDocumentsApp,
    title: "My Documents",
    icon: "https://win98icons.alexmeub.com/icons/png/directory_open_file_mydocs-4.png",
  },
  CONFIRM_DIALOG: {
    component: ConfirmDialogApp,
    title: "Confirm",
    icon: "https://win98icons.alexmeub.com/icons/png/msg_warning-0.png",
  },
  // ADICIONADO: Registo do Input Dialog
  INPUT_DIALOG: {
    component: InputDialogApp,
    title: "Input",
    icon: "/icons/notepad.png",
  },
};

const WindowManagerContext = createContext();

export const WindowManagerProvider = ({ children }) => {
  const [windows, setWindows] = useState([]);
  const [highestZIndex, setHighestZIndex] = useState(10);

  const openWindow = useCallback(
    (appKey, data = {}) => {
      const appConfig = appRegistry[appKey];
      if (!appConfig) {
        console.error(`App não encontrada no registo: ${appKey}`);
        return;
      }

      const newZIndex = highestZIndex + 1;
      setHighestZIndex(newZIndex);

      // Tamanhos padrão
      let windowSize = { width: 640, height: 480 };

      if (appKey === "LEADERBOARD") windowSize = { width: 600, height: 500 };
      else if (appKey === "DAILY_DROP")
        windowSize = { width: 400, height: 550 };
      else if (appKey === "CONFIRM_DIALOG")
        windowSize = { width: 350, height: 160 };
      // Tamanho para o Input Dialog
      else if (appKey === "INPUT_DIALOG")
        windowSize = { width: 350, height: 160 };

      // Override se passares tamanho no data
      if (data.width && data.height) {
        windowSize = { width: data.width, height: data.height };
      }

      const newWindow = {
        id: uuidv4(),
        appKey,
        title: data.title || appConfig.title,
        content: appConfig.component,
        icon: data.icon || appConfig.icon, // Permite ícone dinâmico
        zIndex: newZIndex,
        isMinimized: false,
        isMaximized: false,
        position: { x: 150 + Math.random() * 30, y: 150 + Math.random() * 30 },
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
