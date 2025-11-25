import React, { useEffect, useState } from "react";

const BootScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Tempo de boot (3 segundos)
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);

    // Animação da barra (loop infinito estilo XP)
    const interval = setInterval(() => {
      setProgress((old) => (old >= 100 ? 0 : old + 2));
    }, 50);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [onComplete]);

  return (
    <div className="w-full h-screen bg-black flex flex-col items-center justify-center font-sans relative overflow-hidden">
      {/* --- LOGO --- */}
      {/* Ajusta o 'mb-16' se precisares de mais/menos espaço entre o logo e a barra */}
      <div className="mb-16 flex flex-col items-center">
        <img
          src="/boot.png"
          alt="VerseVault XP"
          // Se a tua imagem já for o ecrã todo preto, usa 'w-auto h-auto'.
          // Se for só o logo cortado, usa este tamanho para não ficar gigante:
          className="max-w-[300px] md:max-w-[400px] object-contain"
        />
      </div>

      {/* --- BARRA DE LOADING (XP Style) --- */}
      {/* Borda cinzenta arredondada */}
      <div className="w-[200px] h-[14px] border-2 border-[#585858] rounded-[3px] p-[2px] relative bg-black flex items-center justify-start overflow-hidden">
        {/* Os 3 bloquinhos azuis que viajam juntos */}
        <div
          className="flex space-x-[2px] h-full absolute top-[2px]"
          style={{
            left: `${progress}%`,
            transition: "left 0.05s linear", // Movimento suave
          }}
        >
          {/* Bloco 1 (Mais transparente) */}
          <div className="w-3 h-full bg-gradient-to-b from-[#8CB8FF] to-[#3059B0] rounded-[1px] shadow-[0_0_5px_rgba(48,89,176,0.8)] opacity-50" />
          {/* Bloco 2 (Médio) */}
          <div className="w-3 h-full bg-gradient-to-b from-[#8CB8FF] to-[#3059B0] rounded-[1px] shadow-[0_0_5px_rgba(48,89,176,0.8)] opacity-80" />
          {/* Bloco 3 (Forte) */}
          <div className="w-3 h-full bg-gradient-to-b from-[#8CB8FF] to-[#3059B0] rounded-[1px] shadow-[0_0_5px_rgba(48,89,176,0.8)]" />
        </div>
      </div>

      {/* --- FOOTER (Copyright) --- */}
      {/* Posicionado no canto inferior esquerdo, como no print */}
      <div className="absolute bottom-4 left-4 text-white text-[10px] font-medium">
        Copyright © Microsoft Corporation
      </div>
    </div>
  );
};

export default BootScreen;
