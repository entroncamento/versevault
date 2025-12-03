import React, { useRef, useEffect, Suspense } from "react";
import { useWindowManager } from "../../contexts/WindowManagerContext";
import WindowControls from "./WindowControls";

// --- COMPONENTE DE SEGURANÇA (ERROR BOUNDARY) ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Window Crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-[#ECE9D8] text-red-600 p-4 text-center font-sans select-none">
          <img
            src="/icons/doctor_watson.png"
            className="w-12 h-12 mb-2"
            onError={(e) => (e.target.style.display = "none")}
            alt="Error"
          />
          <p className="font-bold text-sm">Program Error</p>
          <p className="text-xs mt-1">
            The application has encountered a problem and needs to close.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 px-3 py-1 bg-[#F0F0F0] border border-[#003C74] rounded-[3px] text-xs hover:bg-white shadow-sm active:translate-y-px"
          >
            Restart App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- COMPONENTE JANELA ---
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
          {/* PROTEÇÃO: ErrorBoundary + Suspense */}
          <ErrorBoundary>
            <Suspense
              fallback={
                <div className="h-full flex items-center justify-center bg-[#ECE9D8]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003399]"></div>
                </div>
              }
            >
              <ContentComponent windowId={id} {...props} />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default Window;
