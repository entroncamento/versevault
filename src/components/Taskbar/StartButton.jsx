import React from "react";
import startButtonImage from "/start.png"; // Confirma se o caminho está correto para ti

const StartButton = ({ onClick }) => {
  return (
    <button
      id="start-button" // <--- ADICIONA ESTE ID
      onClick={onClick}
      className="h-[28px] active:translate-y-px outline-none"
    >
      <img
        src={startButtonImage}
        alt="start"
        className="h-full pointer-events-none" // pointer-events-none ajuda a garantir que o alvo do clique é o botão
      />
    </button>
  );
};

export default StartButton;
