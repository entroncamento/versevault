import React, { useState } from "react";
import { updateProfile } from "firebase/auth";
import { useAuth } from "../contexts/AuthContext";
import { useWindowManager } from "../contexts/WindowManagerContext";

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

const UserAccountsApp = ({ windowId }) => {
  const { currentUser } = useAuth();
  const { closeWindow } = useWindowManager();

  const [name, setName] = useState(currentUser?.displayName || "");
  const [photoUrl, setPhotoUrl] = useState(
    currentUser?.photoURL || "/icons/Minesweeper.ico"
  );
  const [loading, setLoading] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await updateProfile(currentUser, {
        displayName: name,
        photoURL: photoUrl,
      });

      closeWindow(windowId);
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      alert("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    closeWindow(windowId);
  };

  return (
    <div className="h-full w-full bg-white font-sans flex flex-col overflow-hidden relative">
      {showIconPicker && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/20"
          onClick={() => setShowIconPicker(false)}
        >
          <div
            className="bg-[#ECE9D8] border-[3px] border-[#0055E5] rounded-t-lg shadow-xl w-[320px] p-[2px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-[#0058EE] to-[#3593FF] text-white font-bold px-2 py-1 flex justify-between items-center select-none shadow-sm mb-1 rounded-sm">
              <span className="drop-shadow-sm text-sm">Change Icon</span>
              <button
                onClick={() => setShowIconPicker(false)}
                className="bg-[#D84937] w-5 h-5 flex items-center justify-center border border-white rounded-sm text-xs hover:brightness-110 text-white font-bold"
              >
                X
              </button>
            </div>
            <div className="text-xs text-gray-600 px-2 mb-2">
              Select an icon:
            </div>
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
                    alt="icon"
                    className="w-10 h-10 object-contain group-hover:scale-110 transition-transform"
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

      <div className="h-[50px] bg-[#003399] flex items-center px-4 justify-between relative overflow-hidden border-b-[2px] border-orange-400 flex-shrink-0">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-white/10 pointer-events-none" />
        <div className="flex items-center gap-4 z-10">
          <button
            onClick={handleCancel}
            className="group flex items-center gap-1 cursor-pointer"
          >
            <div className="w-6 h-6 rounded-full bg-[#42B638] border-2 border-[#76C46F] flex items-center justify-center shadow-md group-hover:brightness-110">
              <span className="text-white font-bold text-sm mb-[2px]">←</span>
            </div>
            <span className="text-white text-xs font-bold shadow-black drop-shadow-md group-hover:underline">
              Back
            </span>
          </button>
        </div>
        <span className="text-white font-bold text-lg drop-shadow-md">
          User Accounts
        </span>
      </div>

      {/* --- CORPO --- */}
      <div className="flex flex-grow overflow-auto">
        {/* Sidebar Azul */}
        <div className="w-[200px] bg-[#6477CB] relative hidden md:block border-r border-[#003399] flex-shrink-0">
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#003399]/50 to-transparent" />
          <div className="p-4 text-white text-xs">
            <p className="mb-2">
              <strong>Learn About</strong>
            </p>
            <ul className="list-disc list-inside opacity-80">
              <li>Changing your name</li>
              <li>Changing your picture</li>
            </ul>
          </div>
        </div>

        {/* Área de Edição */}
        <div className="flex-grow p-8 flex flex-col">
          <h1 className="text-[#003399] text-2xl font-light mb-6">
            Change your profile
          </h1>

          <form onSubmit={handleSave} className="flex flex-col gap-6 max-w-md">
            {/* Nome */}
            <div className="flex flex-col gap-2">
              <label className="text-gray-800 text-xs font-bold">
                Type a new name for your account:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-1 border-2 border-[#7F9DB9] rounded-[3px] outline-none focus:border-[#3C7FB1] shadow-inner text-sm px-2"
              />
            </div>

            <p className="text-gray-600 text-xs">
              This name will appear on the Welcome screen and on the Start menu.
            </p>

            {/* Foto */}
            <div className="flex items-start gap-4 mt-2">
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 bg-white border-2 border-[#7F9DB9] rounded-[3px] flex-shrink-0 overflow-hidden shadow-sm flex items-center justify-center p-1">
                  <img
                    src={photoUrl}
                    alt="Profile"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.src = "/icons/Minesweeper.ico";
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 flex-grow">
                <label className="text-gray-800 text-xs font-bold">
                  Pick a new picture:
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowIconPicker(true)}
                    className="px-3 py-1 bg-[#F0F0F0] border border-[#003C74] rounded-[3px] text-xs text-black hover:bg-white shadow-sm active:translate-y-[1px]"
                  >
                    Browse Pictures...
                  </button>
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#D6D3CE] to-transparent my-2" />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-1 bg-white border border-[#003C74] rounded-[3px] text-sm text-black hover:bg-[#E1EAF8] active:bg-[#C3D3EA] shadow-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-1 bg-white border border-[#003C74] rounded-[3px] text-sm text-black font-bold hover:bg-[#E1EAF8] active:bg-[#C3D3EA] shadow-sm border-2 border-b-[#002050] border-r-[#002050]"
              >
                {loading ? "Saving..." : "Change Profile"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserAccountsApp;
