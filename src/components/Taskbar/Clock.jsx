import React, { useState, useEffect } from "react";

/**
 * Componente Relógio da Barra de Tarefas (System Tray).
 * * Funcionalidades:
 * - Atualização em tempo real (Tick de 1 segundo).
 * - Formatação estilo Windows XP (HH:MM AM/PM).
 * - Tooltip nativo com a data completa (Easter Egg de UX).
 */
const Clock = () => {
  // Inicializa com a hora atual
  const [time, setTime] = useState(new Date());

  // =========================================================
  // TIMER LIFECYCLE
  // =========================================================
  useEffect(() => {
    // Configura o "Heartbeat" do relógio
    const timerId = setInterval(() => {
      setTime(new Date());
    }, 1000);

    // Cleanup: Remove o intervalo se a Taskbar for desmontada (ex: Logoff)
    return () => {
      clearInterval(timerId);
    };
  }, []);

  // =========================================================
  // FORMATTERS (Intl API)
  // =========================================================

  const formatTime = (date) => {
    // Ex: "4:20 PM"
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true, // Força formato AM/PM típico do XP
    });
  };

  const formatDate = (date) => {
    // Ex: "Wednesday, December 17, 2025" (Aparece no Hover)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div
      // Classes para interação:
      // - cursor-default: O relógio não é clicável como um botão.
      // - hover:bg-[#1240AB]: Efeito subtil de hover azul escuro (comum na tray).
      className="text-white text-xs font-sans h-full flex items-center justify-center px-2 cursor-default select-none hover:bg-[#1240AB] rounded-[2px] transition-colors"
      // O atributo 'title' cria o tooltip nativo do browser/SO
      title={formatDate(time)}
    >
      {formatTime(time)}
    </div>
  );
};

export default Clock;
