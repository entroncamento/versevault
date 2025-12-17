import React, { useState } from "react";
import { updateProfile } from "firebase/auth";

// =========================================================
// ASSETS CURADOS (Iconografia Retro)
// =========================================================
// Esta lista foi filtrada manualmente para garantir que apenas ícones
// com fundo transparente e boa resolução são usados.
const XP_ICONS = [
  "https://win98icons.alexmeub.com/icons/png/tree-0.png",
  "https://win98icons.alexmeub.com/icons/png/camera-0.png",
  "https://win98icons.alexmeub.com/icons/png/cd_audio_cd_a-0.png",
  "https://win98icons.alexmeub.com/icons/png/world-0.png",
  "https://win98icons.alexmeub.com/icons/png/game_spider-0.png",
  "https://win98icons.alexmeub.com/icons/png/joystick-4.png",
  "https://win98icons.alexmeub.com/icons/png/minesweeper-1.png",
  "https://win98icons.alexmeub.com/icons/png/camera3_vid-2.png",
  "https://win98icons.alexmeub.com/icons/png/console_prompt-0.png",
  "https://win98icons.alexmeub.com/icons/png/doctor_watson.png",
  "https://win98icons.alexmeub.com/icons/png/game_freecell-2.png",
  "https://win98icons.alexmeub.com/icons/png/loudspeaker_muted-0.png",
];

/**
 * Ecrã de "First Run Experience" (FRX).
 * Aparece apenas na primeira vez que um utilizador se regista
 * para definir o Display Name e Avatar.
 */
const CreateProfileScreen = ({ user, onComplete, onCancel }) => {
  // Inicialização de Estado com dados existentes (ex: Google Auth pode já trazer nome)
  const [name, setName] = useState(user.displayName || "");

  // Default Icon: A clássica árvore do Windows XP
  const [photoUrl, setPhotoUrl] = useState(
    "https://win98icons.alexmeub.com/icons/png/tree-0.png"
  );

  const [loading, setLoading] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  // =========================================================
  // HANDLERS
  // =========================================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validação: Não aceitamos nomes vazios ou só espaços
    if (!name.trim()) return;

    setLoading(true);
    try {
      // Firebase Auth Update
      await updateProfile(user, {
        displayName: name,
        // Fallback defensivo: Se a URL estiver vazia, forçamos a árvore
        photoURL:
          photoUrl.trim() === ""
            ? "https://win98icons.alexmeub.com/icons/png/tree-0.png"
            : photoUrl,
      });

      // Notifica o componente pai (LoginScreen) que o setup terminou
      onComplete();
    } catch (error) {
      console.error("Critical Error: Profile Update Failed", error);
      alert("Não foi possível criar o perfil. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-screen bg-white font-sans flex flex-col overflow-hidden relative">
      {/* =========================================================
          MODAL DE ÍCONES (Overlay)
         ========================================================= */}
      {showIconPicker && (
        <div
          // Backdrop escurecido
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/20"
          onClick={() => setShowIconPicker(false)}
        >
          <div
            // Janela do Modal
            className="bg-[#ECE9D8] border-[3px] border-[#0055E5] rounded-t-lg shadow-xl w-[320px] p-[2px]"
            onClick={(e) => e.stopPropagation()} // Impede fechar ao clicar dentro
          >
            {/* Modal Title Bar */}
            <div className="bg-gradient-to-r from-[#0058EE] to-[#3593FF] text-white font-bold px-2 py-1 flex justify-between items-center select-none shadow-sm mb-1 rounded-sm">
              <span className="drop-shadow-sm text-sm">Change Icon</span>
              <button
                onClick={() => setShowIconPicker(false)}
                className="bg-[#D84937] w-5 h-5 flex items-center justify-center border border-white rounded-sm text-xs hover:brightness-110 shadow-sm text-white font-bold"
              >
                X
              </button>
            </div>

            <div className="text-xs text-gray-600 px-2 mb-2">
              Select an icon from the list below:
            </div>

            {/* Grid de Seleção */}
            <div className="p-2 bg-white m-[2px] border-2 border-inset border-[#7F9DB9] h-[220px] overflow-y-auto grid grid-cols-4 gap-2 content-start">
              {XP_ICONS.map((icon, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setPhotoUrl(icon);
                    setShowIconPicker(false);
                  }}
                  className="w-14 h-14 border border-transparent hover:bg-[#E1EAF8] hover:border-[#316AC5] flex items-center justify-center rounded transition-colors group"
                >
                  <img
                    src={icon}
                    alt={`icon-${index}`}
                    className="w-10 h-10 object-contain group-hover:scale-110 transition-transform"
                    // Hide broken images automatically
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2 p-2 bg-[#ECE9D8] border-t border-white">
              <button
                onClick={() => setShowIconPicker(false)}
                className="px-4 py-1 bg-[#F0F0F0] border border-[#003C74] rounded-[3px] text-xs hover:bg-white shadow-sm active:translate-y-[1px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          LAYOUT PRINCIPAL (Wizard Style)
         ========================================================= */}

      {/* Header Azul Escuro */}
      <div className="h-[60px] bg-[#003399] flex items-center px-4 justify-between relative overflow-hidden border-b-[3px] border-orange-400">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-white/10 pointer-events-none" />

        <div className="flex items-center gap-4 z-10">
          <button
            onClick={onCancel}
            className="group flex items-center gap-1 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-[#42B638] border-2 border-[#76C46F] flex items-center justify-center shadow-md group-hover:brightness-110 transition-all">
              <span className="text-white font-bold text-lg mb-1">←</span>
            </div>
            <span className="text-white text-xs font-bold shadow-black drop-shadow-md group-hover:underline">
              Back
            </span>
          </button>

          <div className="flex items-center gap-1 opacity-50">
            <div className="w-8 h-8 rounded-full bg-[#ECA630] border-2 border-[#F2C673] flex items-center justify-center">
              <span className="text-white text-lg">🏠</span>
            </div>
            <span className="text-white text-xs font-bold">Home</span>
          </div>
        </div>

        <span className="text-white font-bold text-lg drop-shadow-md">
          User Accounts
        </span>
      </div>

      {/* Conteúdo Central */}
      <div className="flex flex-grow">
        {/* Sidebar Informativa (Left Panel) */}
        <div className="w-[250px] bg-[#6477CB] relative hidden md:block border-r border-[#003399]">
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#003399]/50 to-transparent" />
          <div className="p-6 text-white/80 text-sm italic">
            "Customize your VerseVault experience."
          </div>
        </div>

        {/* Formulário (Right Panel) */}
        <div className="flex-grow p-12 flex flex-col max-w-2xl">
          <h1 className="text-[#003399] text-3xl font-light mb-8">
            Name the new account
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-gray-800 text-sm font-bold">
                Type a name for the new account:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full max-w-md p-1 border-2 border-[#7F9DB9] rounded-[3px] outline-none focus:border-[#3C7FB1] shadow-inner text-sm px-2"
                autoFocus
              />
            </div>

            <p className="text-gray-600 text-sm">
              This name will appear on the Welcome screen and on the Start menu.
            </p>

            {/* Avatar Section */}
            <div className="flex items-center gap-4 mt-4">
              <div className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 bg-white border-2 border-[#7F9DB9] rounded-[3px] flex-shrink-0 overflow-hidden shadow-sm flex items-center justify-center p-1">
                  <img
                    src={photoUrl}
                    alt="Profile"
                    className="w-full h-full object-contain"
                    // Fallback to Tree icon on error
                    onError={(e) => {
                      e.target.src =
                        "https://win98icons.alexmeub.com/icons/png/tree-0.png";
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 flex-grow">
                <label className="text-gray-800 text-sm font-bold">
                  Pick a picture for your account:
                </label>

                <div className="flex gap-2 max-w-md items-center">
                  <button
                    type="button" // Importante: não submeter o form
                    onClick={() => setShowIconPicker(true)}
                    className="px-4 py-1 bg-[#F0F0F0] border border-[#003C74] rounded-[3px] text-xs text-black hover:bg-white shadow-sm active:translate-y-[1px]"
                  >
                    Browse for pictures...
                  </button>
                  <span className="text-xs text-gray-500 italic">
                    Click to choose an icon
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full max-w-md h-[2px] bg-gradient-to-r from-transparent via-[#D6D3CE] to-transparent my-4" />

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end max-w-md">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-1 bg-white border border-[#003C74] rounded-[3px] text-sm text-black hover:bg-[#E1EAF8] active:bg-[#C3D3EA] shadow-sm"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-1 bg-white border border-[#003C74] rounded-[3px] text-sm text-black font-bold hover:bg-[#E1EAF8] active:bg-[#C3D3EA] shadow-sm border-2 border-b-[#002050] border-r-[#002050]"
              >
                {loading ? "Creating..." : "Finish"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateProfileScreen;
