import React, { useRef, useEffect } from "react";

/**
 * Componente Ícone de Desktop.
 * Implementa lógica de Drag & Drop manual para total controlo de posicionamento (X/Y livre).
 * * Design Pattern:
 * Utilizamos `useRef` para guardar o estado do arrasto (coordenadas iniciais)
 * porque estes valores não precisam de desencadear re-renders visuais por si só,
 * apenas o `onMove` (que atualiza o pai) é que deve causar renderização.
 */
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
  // --- REFS PARA GESTÃO DE ARRASTO ---
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 }); // Onde o rato clicou
  const iconStart = useRef({ x: 0, y: 0 }); // Onde o ícone estava

  // =========================================================
  // MOUSE EVENT HANDLERS
  // =========================================================

  const handleMouseDown = (e) => {
    // Apenas botão esquerdo (0) inicia arrasto
    if (e.button !== 0) return;

    // Stop Propagation: Impede que o clique "vaze" para o Desktop,
    // o que causaria a desseleção imediata do ícone.
    e.stopPropagation();

    // Notifica o pai que este ícone foi selecionado
    onSelect(id);

    isDragging.current = true;

    // Snapshot das coordenadas iniciais
    dragStart.current = { x: e.clientX, y: e.clientY };
    iconStart.current = { ...position };

    // UX TRICK: Adicionamos listeners ao DOCUMENTO, não ao elemento.
    // Isto garante que o arrasto continua fluido mesmo se o rato se mover
    // mais rápido que a renderização do ícone e sair da área da div.
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;

    // Cálculo do Delta (Diferença)
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    // Callback para o pai atualizar o estado (re-render)
    onMove(id, { x: iconStart.current.x + dx, y: iconStart.current.y + dy });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    // Limpeza de memória: Remove listeners globais para evitar leaks
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  // Cleanup effect: Garante que se o componente for desmontado durante um arrasto,
  // os eventos não ficam presos no document.
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div
      // Classes Tailwind para posicionamento e comportamento
      className={`absolute w-[75px] flex flex-col items-center justify-start cursor-default p-1 select-none 
        ${
          isSelected
            ? // Estilo XP Selected: Fundo azul translúcido + Borda pontilhada
              "bg-[#0B61FF]/60 border border-dotted border-white/50"
            : "hover:bg-white/10 border border-transparent"
        }
      `}
      style={{ left: position.x, top: position.y, touchAction: "none" }}
      onMouseDown={handleMouseDown}
      onDoubleClick={onDoubleClick}
    >
      {/* Imagem do Ícone (com efeito de opacidade quando selecionado) */}
      <img
        src={icon}
        alt={label}
        draggable={false} // Desativa o "Ghost Image" nativo do browser
        className={`w-8 h-8 mb-1 pointer-events-none ${
          isSelected ? "opacity-80 mix-blend-hard-light" : ""
        }`}
      />

      {/* Rótulo do Ícone */}
      <span
        className={`text-[11px] text-center leading-tight px-[2px] font-sans rounded-[1px]
            ${isSelected ? "text-white bg-[#0B61FF]" : "text-white"}
        `}
        style={{
          // Windows XP Shadow Trick:
          // O texto no desktop tem uma sombra dura (preta) para legibilidade em wallpapers coloridos.
          // Quando selecionado, a sombra desaparece e o fundo fica azul sólido.
          textShadow: isSelected ? "none" : "1px 1px 0 #000000",
          overflowWrap: "break-word",
          maxWidth: "100%",
        }}
      >
        {label}
      </span>
    </div>
  );
};

export default Icon;
