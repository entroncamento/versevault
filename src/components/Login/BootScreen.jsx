import React, { useEffect, useState } from "react";

/**
 * Ecrã de Boot (Simulação de BIOS/OS Load).
 * Este componente é puramente estético ("Eye Candy") para definir o tom da aplicação
 * antes do Login Screen aparecer.
 */
const BootScreen = ({ onComplete }) => {
  // Estado para a animação da barra de progresso (0 a 100)
  const [progress, setProgress] = useState(0);

  // =========================================================
  // CICLO DE VIDA (Mount & Unmount)
  // =========================================================
  useEffect(() => {
    // 1. Temporizador Principal: Define a duração total do "Boot".
    // 3 segundos é o "Sweet Spot" entre nostalgia e aborrecimento do utilizador.
    const timer = setTimeout(() => {
      onComplete(); // Notifica o componente pai (App.jsx) para trocar de ecrã
    }, 3000);

    // 2. Motor de Animação:
    // Atualiza a posição da barra a cada 50ms para criar movimento fluido.
    const interval = setInterval(() => {
      setProgress((old) => {
        // Lógica de Loop: Quando chega ao fim (100%), reseta para o início (0%)
        // simulando o comportamento infinito do boot do Windows XP.
        return old >= 100 ? 0 : old + 2;
      });
    }, 50);

    // CLEANUP FUNCTION:
    // Crítico! Se o componente for desmontado antes dos 3s (ex: hot reload ou navegação),
    // devemos limpar os temporizadores para evitar memory leaks ou chamadas a
    // componentes inexistentes (o famoso erro "Can't perform state update on unmounted component").
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [onComplete]);

  return (
    <div className="w-full h-screen bg-black flex flex-col items-center justify-center font-sans relative overflow-hidden select-none">
      {/* --- LOGO AREA --- */}
      <div className="mb-16 flex flex-col items-center">
        <img
          src="/boot.png" // Asset localizado na pasta 'public'
          alt="VerseVault XP"
          // Classes responsivas para garantir que o logo não domina ecrãs pequenos
          className="max-w-[300px] md:max-w-[400px] object-contain"
          // Fallback visual caso a imagem não carregue, para não quebrar a imersão
          onError={(e) => (e.target.style.display = "none")}
        />
      </div>

      {/* --- PROGRESS BAR (Estilo Retro) --- */}
      {/* Container da barra: Borda cinzenta com padding interno simulando profundidade */}
      <div className="w-[200px] h-[14px] border-2 border-[#585858] rounded-[3px] p-[2px] relative bg-black flex items-center justify-start overflow-hidden">
        {/* Grupo de Blocos Azuis (O "Comboio") */}
        <div
          className="flex space-x-[2px] h-full absolute top-[2px]"
          style={{
            left: `${progress}%`, // Interpolação direta do estado para CSS
            transition: "left 0.05s linear", // Garante movimento linear e não "aos soluços"
          }}
        >
          {/* Bloco 1 (Cauda - Mais transparente) */}
          <div className="w-3 h-full bg-gradient-to-b from-[#8CB8FF] to-[#3059B0] rounded-[1px] shadow-[0_0_5px_rgba(48,89,176,0.8)] opacity-50" />

          {/* Bloco 2 (Corpo - Opacidade Média) */}
          <div className="w-3 h-full bg-gradient-to-b from-[#8CB8FF] to-[#3059B0] rounded-[1px] shadow-[0_0_5px_rgba(48,89,176,0.8)] opacity-80" />

          {/* Bloco 3 (Cabeça - Opacidade Total) */}
          <div className="w-3 h-full bg-gradient-to-b from-[#8CB8FF] to-[#3059B0] rounded-[1px] shadow-[0_0_5px_rgba(48,89,176,0.8)]" />
        </div>
      </div>

      {/* --- FOOTER (Copyright) --- */}
      {/* Posicionamento absoluto para fixar no canto, independente do flex center */}
      <div className="absolute bottom-4 left-4 text-white text-[10px] font-medium">
        Copyright © VerseVault Corporation
      </div>
    </div>
  );
};

export default BootScreen;
