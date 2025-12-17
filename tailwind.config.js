/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Tahoma", "Segoe UI", "Geneva", "Verdana", "sans-serif"],
      },
      colors: {
        // Cores da Barra de Tarefas (Azul XP)
        "xp-taskbar-start": "#245EDC",
        "xp-taskbar-end": "#3E80F2",
        "xp-taskbar-border": "#1943A1",

        // Cores dos Itens da Taskbar
        "xp-item-active-start": "#1E52C4",
        "xp-item-active-end": "#3276EB",
        "xp-item-inactive-start": "#3C81F3",
        "xp-item-inactive-end": "#5595F5",

        // Cores do Menu Iniciar
        "xp-start-header": "#1763E8",
        "xp-start-bodyLeft": "#FFFFFF",
        "xp-start-bodyRight": "#D3E5FA",
        "xp-start-footer": "#3782F4",
        "xp-start-hover": "#316AC5",
        "xp-start-border": "#003598",
        "xp-start-orange": "#E55E00",

        // System Tray (Relógio)
        "xp-tray-start": "#0E75CD",
        "xp-tray-end": "#1997E3",
        "xp-tray-border": "#0D5799",
      },
      boxShadow: {
        "xp-window": "2px 2px 10px rgba(0,0,0,0.4)",
        "xp-tray": "inset 1px 1px 2px rgba(0,0,0,0.3)",
        "xp-start": "4px 4px 8px rgba(0,0,0,0.5)",
      },
      backgroundImage: {
        "xp-header-gradient":
          "linear-gradient(to bottom, #1763E8 0%, #1557D4 100%)",
        "xp-login-bg": "linear-gradient(135deg, #5A7EDC 0%, #3D5DB0 100%)",
        "xp-login-header":
          "linear-gradient(to right, #003CA5 0%, #002B76 100%)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.2s ease-out forwards",
        slideUp: "slideUp 0.3s ease-out forwards",
      },
    },
  },
  plugins: [],
};
