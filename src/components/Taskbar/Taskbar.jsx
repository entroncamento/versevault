import React, { useState } from "react";
import { useWindowManager } from "../../contexts/WindowManagerContext.jsx";
import StartButton from "./StartButton.jsx";
import TaskbarItem from "./TaskbarItem.jsx";
import Clock from "./Clock.jsx";
import StartMenu from "../StartMenu/StartMenu.jsx";

const Taskbar = () => {
  const { windows } = useWindowManager();
  const [startMenuOpen, setStartMenuOpen] = useState(false);

  return (
    <>
      {startMenuOpen && <StartMenu onClose={() => setStartMenuOpen(false)} />}

      <div
        className="absolute bottom-0 left-0 right-0 h-30px bg-gradient-to-b from-xp-taskbar-start to-xp-taskbar-end
                   border-t border-xp-taskbar-border flex items-center px-1.5 z-[1000]"
      >
        <StartButton onClick={() => setStartMenuOpen((prev) => !prev)} />

        <div className="w-[1px] h-[26px] bg-xp-separator-l border-r border-xp-separator-r ml-1.5 mr-1" />

        <div className="flex-grow h-full p-[3px] flex items-center space-x-1.5">
          {windows.map((w) => (
            <TaskbarItem key={w.id} window={w} />
          ))}
        </div>

        <div
          className="h-full bg-gradient-to-t from-xp-tray-start to-xp-tray-end 
                     rounded-l-md border-l border-xp-tray-border 
                     shadow-xp-tray flex items-center px-1.5"
        >
          <Clock />
        </div>
      </div>
    </>
  );
};

export default Taskbar;
