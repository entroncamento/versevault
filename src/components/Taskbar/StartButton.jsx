import React from "react";
// Importa a imagem do botão Iniciar (verde clássico do XP)
// Nota: O Vite resolve caminhos absolutos '/' a partir da pasta 'public'
import startButtonImage from "/start.png";

/**
 * Componente Botão Iniciar.
 * * Detalhes Técnicos:
 * - ID "start-button": Essencial para a lógica de "Click Outside" do StartMenu.
 * O menu verifica se o clique veio deste ID para decidir se deve fechar ou alternar.
 * - pointer-events-none: Garante que cliques na imagem são capturados pelo botão pai.
 */
const StartButton = ({ onClick }) => {
  return (
    <button
      id="start-button" // ID de referência para o StartMenu (Não remover!)
      onClick={onClick}
      className="h-[28px] active:translate-y-[1px] outline-none transition-transform select-none"
      title="Click here to begin"
    >
      <img
        src={startButtonImage}
        alt="Start"
        draggable={false} // Previne "ghost dragging" da imagem
        className="h-full object-contain pointer-events-none" // A imagem é "transparente" a cliques
      />
    </button>
  );
};

export default StartButton;
