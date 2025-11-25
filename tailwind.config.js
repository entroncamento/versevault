/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Tahoma", "Verdana", "sans-serif"], // Fonte oficial do XP
      },
      boxShadow: {
        "xp-icon": "1px 1px 0px rgba(0,0,0,1)", // Sombra dura do texto dos ícones
        "xp-window": "2px 2px 10px rgba(0,0,0,0.4)", // Sombra da janela
        "xp-start": "2px 4px 10px rgba(0,0,0,0.5)", // Sombra do menu iniciar
      },
      colors: {
        // --- TEMA LUNA BLUE OFICIAL ---
        xp: {
          // Barra de Tarefas
          taskbar: {
            start: "#245DDA", // Azul topo
            end: "#003399", // Azul fundo (mais escuro)
            border: "#0055EA", // Borda superior
          },
          // Menu Iniciar
          start: {
            header: "#003399", // Topo onde diz o nome
            bodyLeft: "#FFFFFF", // Coluna branca
            bodyRight: "#D3E5FA", // Coluna azul clara
            footer: "#003399", // Rodapé (Log off)
            border: "#003399", // Borda externa azul escura
            hover: "#316AC5", // Azul de seleção
            orange: "#E68B2C", // Laranja do botão de desligar
          },
          // Janelas
          window: {
            frame: "#0055E5", // Azul da borda
            headerStart: "#0058EE",
            headerEnd: "#3593FF",
          },
        },
      },
      backgroundImage: {
        "xp-taskbar-gradient":
          "linear-gradient(to bottom, #245DDA 0%, #1F52C9 10%, #003399 100%)",
        "xp-header-gradient":
          "linear-gradient(to bottom, #0058EE 0%, #3593FF 4%, #288EFF 18%, #127DFF 44%, #0369FC 100%)",
      },
    },
  },
  plugins: [],
};
