import React, { useRef, useEffect } from "react";

const Icon = ({
  id,
  icon,
  label,
  position,
  onDoubleClick,
  onMove,
  isSelected,
  onSelect,
}) => {
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const iconStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect(id);

    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    iconStart.current = { ...position };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    onMove(id, { x: iconStart.current.x + dx, y: iconStart.current.y + dy });
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

  return (
    <div
      className={`absolute w-[75px] flex flex-col items-center justify-start cursor-default p-1 
        ${
          isSelected
            ? "bg-[#0B61FF]/80 border border-dotted border-white/50"
            : "hover:bg-white/10"
        }
      `}
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
      onDoubleClick={onDoubleClick}
    >
      <img
        src={icon}
        alt={label}
        className={`w-8 h-8 mb-1 ${isSelected ? "opacity-80" : ""}`}
      />

      <span
        className={`text-[11px] text-center leading-tight px-[2px] font-sans
            ${isSelected ? "text-white bg-[#0B61FF]" : "text-white"}
        `}
        style={{
          // A sombra clássica do XP não é blur, é offset sólido
          textShadow: isSelected ? "none" : "1px 1px 0 #000000",
          overflowWrap: "break-word",
        }}
      >
        {label}
      </span>
    </div>
  );
};

export default Icon;
