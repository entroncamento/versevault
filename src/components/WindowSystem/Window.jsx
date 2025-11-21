import React, { useRef, useEffect } from "react";
import { useWindowManager } from "../../contexts/WindowManagerContext";
import WindowControls from "./WindowControls";

const Window = ({
  id,
  title,
  icon,
  content: ContentComponent,
  zIndex,
  position,
  size,
  isMinimized,
  isMaximized,
  props,
}) => {
  const {
    closeWindow,
    minimizeWindow,
    toggleMaximizeWindow,
    focusWindow,
    updateWindowPosition,
  } = useWindowManager();

  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const windowStart = useRef({ x: 0, y: 0 });

  if (isMinimized) return null;

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    focusWindow(id);
    if (isMaximized) return;
    e.preventDefault();
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    windowStart.current = { ...position };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const newPos = {
      x: windowStart.current.x + dx,
      y: windowStart.current.y + dy,
    };
    updateWindowPosition(id, newPos);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const currentStyle = isMaximized
    ? {
        width: "100%",
        height: "calc(100% - 30px)",
        top: 0,
        left: 0,
        borderRadius: "0",
        zIndex,
      }
    : {
        width: size.width,
        height: size.height,
        top: position.y,
        left: position.x,
        borderRadius: "8px 8px 0 0",
        zIndex,
      };

  return (
    <div
      className="absolute flex flex-col shadow-xp-window font-sans"
      style={{
        ...currentStyle,
        backgroundColor: "#0055E5",
        padding: "3px",
        paddingBottom: "0px",
      }}
      onMouseDown={() => focusWindow(id)}
    >
      <div
        className="h-[30px] flex items-center justify-between px-1 select-none"
        onMouseDown={handleMouseDown}
        onDoubleClick={() => toggleMaximizeWindow(id)}
        style={{
          background: `linear-gradient(to bottom, #0058EE 0%, #3593FF 4%, #288EFF 18%, #127DFF 44%, #0369FC 100%)`,
          borderRadius: isMaximized ? "0" : "5px 5px 0 0",
        }}
      >
        <div className="flex items-center gap-1 pl-1 overflow-hidden pointer-events-none">
          <img
            src={icon || "/icons/notepad.png"}
            alt=""
            className="w-4 h-4"
            style={{ filter: "drop-shadow(1px 1px 0px rgba(0,0,0,0.2))" }}
          />
          <span
            className="text-white font-bold text-[13px] truncate pt-[1px]"
            style={{ textShadow: "1px 1px 1px black" }}
          >
            {title}
          </span>
        </div>
        <div onMouseDown={(e) => e.stopPropagation()}>
          <WindowControls
            onMinimize={() => minimizeWindow(id)}
            onMaximize={() => toggleMaximizeWindow(id)}
            onClose={() => closeWindow(id)}
          />
        </div>
      </div>

      <div className="flex-grow bg-white relative overflow-hidden flex flex-col">
        <div className="flex-grow overflow-auto p-0">
          <ContentComponent windowId={id} {...props} />
        </div>
      </div>
    </div>
  );
};

export default Window;
