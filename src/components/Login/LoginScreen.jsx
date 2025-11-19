import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

const UserCard = ({ name, icon, onClick, isSelected, children }) => (
  <div className="flex items-start mb-4 cursor-pointer" onClick={onClick}>
    <div
      className={`w-16 h-16 border-2 border-white rounded overflow-hidden mr-4 bg-orange-300 ${
        isSelected ? "ring-2 ring-yellow-400" : "opacity-80 hover:opacity-100"
      }`}
    >
      <img src={icon} alt={name} className="w-full h-full object-cover" />
    </div>
    <div className="flex flex-col justify-center min-h-[64px]">
      <span className="text-white text-lg font-medium drop-shadow-md hover:underline hover:text-orange-300 transition-colors">
        {name}
      </span>
      {isSelected && <div className="mt-2 animate-fadeIn">{children}</div>}
    </div>
  </div>
);

const LoginScreen = () => {
  const { loginGoogle, loginEmail, register } = useAuth();
  const [selectedUser, setSelectedUser] = useState(null); // 'GOOGLE' ou 'EMAIL'

  // Form States para Email
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    try {
      await loginGoogle();
    } catch (err) {
      setError("Failed to login with Google.");
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isRegistering) {
        await register(email, password);
      } else {
        await loginEmail(email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="w-full h-screen bg-xp-login-bg flex flex-col font-sans overflow-hidden relative">
      {/* Barra Azul Topo */}
      <div className="h-[80px] bg-xp-login-header border-b-2 border-[#FCA438] w-full" />

      {/* Conteúdo Central */}
      <div className="flex-grow flex items-center justify-center relative z-10">
        {/* Divisão Vertical (Gradiente) */}
        <div className="absolute top-1/2 left-1/2 w-[1px] h-[70%] bg-gradient-to-b from-transparent via-white/30 to-transparent -translate-y-1/2 transform" />

        <div className="w-full max-w-4xl grid grid-cols-2 gap-8 px-8">
          {/* Lado Esquerdo - Logo e Mensagem */}
          <div className="flex flex-col items-end text-right pr-8 justify-center">
            <img
              src="/logo.png"
              alt="Windows XP"
              className="w-48 mb-4 opacity-90"
            />{" "}
            {/* Usa um logo branco se tiveres, ou texto */}
            <h1 className="text-white font-bold text-xl drop-shadow-md">
              Welcome
            </h1>
            <p className="text-blue-200 text-sm mt-2">
              Click your user name to begin
            </p>
          </div>

          {/* Lado Direito - Lista de Utilizadores */}
          <div className="flex flex-col items-start pl-8 justify-center">
            {/* Opção 1: Google Login */}
            <UserCard
              name="Google User"
              icon="/icons/Minesweeper.ico" // Põe aqui um ícone giro
              isSelected={selectedUser === "GOOGLE"}
              onClick={() => setSelectedUser("GOOGLE")}
            >
              <button
                onClick={handleGoogleLogin}
                className="bg-white text-gray-800 px-3 py-1 rounded text-xs font-bold flex items-center shadow-md hover:bg-gray-100"
              >
                <span className="text-blue-500 mr-1">G</span> Sign in with
                Google
              </button>
            </UserCard>

            {/* Opção 2: Email/Pass Login */}
            <UserCard
              name="Guest / Email"
              icon="/icons/notepad.png"
              isSelected={selectedUser === "EMAIL"}
              onClick={() => setSelectedUser("EMAIL")}
            >
              <form
                onSubmit={handleEmailAuth}
                className="bg-blue-800/50 p-2 rounded border border-blue-400/30"
              >
                <input
                  type="email"
                  placeholder="Email"
                  className="block w-48 p-1 mb-1 text-xs rounded-sm border-blue-500 outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div className="flex items-center">
                  <input
                    type="password"
                    placeholder="Password"
                    className="block w-36 p-1 text-xs rounded-sm border-blue-500 outline-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="ml-2 w-6 h-6 bg-green-500 rounded shadow border border-white/50 flex items-center justify-center text-white hover:bg-green-400"
                  >
                    →
                  </button>
                </div>

                <div className="mt-2 text-[10px] text-white">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isRegistering}
                      onChange={() => setIsRegistering(!isRegistering)}
                      className="mr-1"
                    />
                    Create new account?
                  </label>
                </div>
                {error && (
                  <p className="text-[10px] text-red-300 mt-1 max-w-[180px]">
                    {error}
                  </p>
                )}
              </form>
            </UserCard>
          </div>
        </div>
      </div>

      {/* Barra Azul Fundo */}
      <div className="h-[80px] bg-xp-login-header border-t-2 border-[#FCA438] w-full flex items-center justify-between px-8">
        <button className="flex items-center text-white hover:underline text-sm">
          <div className="w-6 h-6 bg-[#D6382D] rounded flex items-center justify-center border border-white mr-2">
            ⏻
          </div>
          Turn off computer
        </button>
        <div className="text-white/50 text-xs">
          After you log on, you can add or change accounts.
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
