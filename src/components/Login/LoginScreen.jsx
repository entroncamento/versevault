import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

// =========================================================
// SUB-COMPONENTE: USER CARD (Cartão de Utilizador)
// =========================================================
/**
 * Representa um "Utilizador" no ecrã de login do XP.
 * Aceita 'children' para injetar o formulário ou botão de login
 * apenas quando o cartão está selecionado.
 */
const UserCard = ({ name, icon, onClick, isSelected, children }) => (
  <div
    className={`flex items-start mb-6 cursor-pointer group transition-all duration-200 ${
      isSelected ? "opacity-100" : "opacity-70 hover:opacity-100"
    }`}
    onClick={onClick}
  >
    {/* Avatar com Borda Estilo XP (Laranja/Amarela) */}
    <div
      className={`w-16 h-16 border-[2px] rounded overflow-hidden mr-4 transition-all
      ${
        isSelected
          ? "border-[#FCA438] ring-2 ring-yellow-300 ring-opacity-50" // Highligh ativo
          : "border-white group-hover:border-[#FCA438]" // Highlight hover
      } bg-orange-200`}
    >
      <img
        src={icon}
        alt={name}
        className="w-full h-full object-cover"
        onError={(e) => {
          e.target.src = "/icons/user.png";
        }} // Fallback seguro
      />
    </div>

    {/* Nome e Área de Conteúdo Expandível */}
    <div className="flex flex-col justify-center min-h-[64px]">
      <span className="text-white text-xl font-medium drop-shadow-md group-hover:underline group-hover:text-orange-200 transition-colors">
        {name}
      </span>

      {/* Renderização Condicional: Só mostra o form se estiver selecionado */}
      {isSelected && (
        <div
          className="mt-2 animate-fadeIn origin-top-left"
          onClick={(e) => e.stopPropagation()} // IMPEDE que cliques no form fechem/re-abram o card
        >
          {children}
        </div>
      )}
    </div>
  </div>
);

// =========================================================
// COMPONENTE PRINCIPAL: LOGIN SCREEN
// =========================================================
const LoginScreen = () => {
  const { loginGoogle, loginEmail, register } = useAuth();

  // State Management
  const [selectedUser, setSelectedUser] = useState(null); // 'GOOGLE' | 'EMAIL'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  // UI States
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Previne múltiplos cliques

  // --- HANDLERS ---

  const handleGoogleLogin = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError("");
    try {
      await loginGoogle();
      // Não precisamos de redirecionar aqui, o AuthContext deteta a mudança de user
      // e o App.jsx desmonta este componente automaticamente.
    } catch (err) {
      setError("Falha ao entrar com Google.");
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setError("");

    try {
      if (isRegistering) {
        await register(email, password);
      } else {
        await loginEmail(email, password);
      }
    } catch (err) {
      // Tradução simples de erros comuns do Firebase
      if (err.code === "auth/invalid-credential") setError("Dados incorretos.");
      else if (err.code === "auth/weak-password")
        setError("Password fraca (min 6 chars).");
      else setError("Erro na autenticação.");

      setIsLoading(false);
    }
  };

  return (
    // Container Principal: Cores definidas no tailwind.config.js ou fallback hex
    <div className="w-full h-screen bg-[#003399] flex flex-col font-sans overflow-hidden relative select-none">
      {/* 1. TOPO (Header) */}
      <div className="h-[90px] bg-gradient-to-r from-[#003399] via-[#658CE6] to-[#003399] border-b-[2px] border-[#FCA438] w-full shadow-md z-20" />

      {/* 2. ÁREA CENTRAL (Split Layout) */}
      <div className="flex-grow flex items-center justify-center relative z-10 bg-gradient-to-br from-[#003399] to-[#4B73C9]">
        {/* Linha Divisória Vertical (Efeito Fade) */}
        <div className="absolute top-1/2 left-1/2 w-[1px] h-[70%] bg-gradient-to-b from-transparent via-white/40 to-transparent -translate-y-1/2 transform hidden md:block" />

        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-12 px-8">
          {/* LADO ESQUERDO: Logo & Welcome */}
          <div className="flex flex-col items-center md:items-end text-center md:text-right pr-0 md:pr-12 justify-center">
            <img
              src="/logo.png" // Certifica-te que tens este asset na pasta public
              alt="Windows XP"
              className="w-48 mb-6 drop-shadow-xl"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <h1 className="text-white font-bold text-4xl drop-shadow-md tracking-tight">
              Welcome
            </h1>
            <p className="text-blue-100 text-lg mt-2 font-medium opacity-90">
              To begin, click your user name
            </p>
          </div>

          {/* LADO DIREITO: Lista de Utilizadores */}
          <div className="flex flex-col items-center md:items-start pl-0 md:pl-12 justify-center min-h-[300px]">
            {/* --- OPÇÃO 1: GOOGLE --- */}
            <UserCard
              name="Google User"
              icon="/icons/world-0.png"
              isSelected={selectedUser === "GOOGLE"}
              onClick={() => {
                setSelectedUser("GOOGLE");
                setError("");
              }}
            >
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="bg-white text-gray-800 px-4 py-2 rounded-[3px] text-sm font-bold flex items-center shadow-md hover:bg-gray-100 active:translate-y-[1px] disabled:opacity-50 transition-all"
              >
                {isLoading ? (
                  <span className="animate-pulse">Connecting...</span>
                ) : (
                  <>
                    <span className="text-blue-600 font-bold mr-2 text-lg">
                      G
                    </span>
                    Sign in with Google
                  </>
                )}
              </button>
              {error && selectedUser === "GOOGLE" && (
                <p className="text-xs text-red-300 mt-2 bg-red-900/30 p-1 rounded">
                  {error}
                </p>
              )}
            </UserCard>

            {/* --- OPÇÃO 2: EMAIL / GUEST --- */}
            <UserCard
              name="Guest / Email"
              icon="/icons/notepad.png"
              isSelected={selectedUser === "EMAIL"}
              onClick={() => {
                setSelectedUser("EMAIL");
                setError("");
              }}
            >
              <form
                onSubmit={handleEmailAuth}
                className="bg-[#003399]/80 p-3 rounded-[4px] border border-white/30 shadow-inner backdrop-blur-sm"
              >
                <input
                  type="email"
                  placeholder="Type your email"
                  className="block w-56 p-1.5 mb-2 text-sm rounded-[2px] border border-[#7F9DB9] outline-none focus:border-[#FCA438] shadow-inner text-black"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus // UX: Foca logo quando abre
                />

                <div className="flex items-center">
                  <input
                    type="password"
                    placeholder="Type your password"
                    className="block w-44 p-1.5 text-sm rounded-[2px] border border-[#7F9DB9] outline-none focus:border-[#FCA438] shadow-inner text-black"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />

                  {/* Botão de Submissão (Seta Verde) */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="ml-3 w-8 h-8 bg-gradient-to-br from-[#4CAF50] to-[#2E7D32] rounded-[3px] shadow-[1px_1px_3px_black] border border-white/40 flex items-center justify-center text-white hover:brightness-110 active:translate-y-[1px] disabled:grayscale"
                  >
                    {isLoading ? "..." : "→"}
                  </button>
                </div>

                {/* Toggle Login/Registo */}
                <div className="mt-3 text-[11px] text-white/90">
                  <label className="flex items-center cursor-pointer hover:text-orange-200">
                    <input
                      type="checkbox"
                      checked={isRegistering}
                      onChange={() => {
                        setIsRegistering(!isRegistering);
                        setError("");
                      }}
                      className="mr-2 accent-orange-500"
                    />
                    Is this a new account?
                  </label>
                </div>

                {/* Mensagens de Erro */}
                {error && selectedUser === "EMAIL" && (
                  <div className="text-[11px] text-white bg-[#D6382D] mt-2 p-1 px-2 rounded-[2px] shadow-sm flex items-center gap-1 animate-pulse">
                    <span>⚠</span> {error}
                  </div>
                )}
              </form>
            </UserCard>
          </div>
        </div>
      </div>

      {/* 3. RODAPÉ (Footer) */}
      <div className="h-[90px] bg-gradient-to-r from-[#003399] via-[#658CE6] to-[#003399] border-t-[2px] border-[#FCA438] w-full flex items-center justify-between px-8 z-20">
        {/* Botão Desligar (Funcional: Reload) */}
        <button
          onClick={() => window.location.reload()}
          className="flex items-center text-white hover:underline text-sm group"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-[#E65C5C] to-[#B22222] rounded-[3px] flex items-center justify-center border border-white/60 mr-2 shadow-md group-hover:brightness-110 group-active:translate-y-[1px]">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              ></path>
            </svg>
          </div>
          <span className="drop-shadow-md">Turn off computer</span>
        </button>

        <div className="text-white/60 text-xs hidden md:block drop-shadow-md">
          After you log on, you can add or change accounts. <br />
          Just go to Control Panel and click User Accounts.
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
