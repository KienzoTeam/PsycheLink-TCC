import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AuthMode } from "../../../types/auth";
import { TabToggle } from "./TabToggle";

interface AuthFormProps {
  mode: AuthMode;
  onToggleMode: (nextMode: AuthMode) => void;
}

export function AuthForm({ mode, onToggleMode }: AuthFormProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Ação disparada ao clicar no botão Entrar/Cadastrar
    if (mode === "login") {
      console.log("Realizando login com:", { email, password });
      // Adicione aqui a sua chamada de API/Autenticação
      navigate("/dashboard");
    } else {
      console.log("Realizando cadastro com:", { name, email, password });
      // Adicione aqui a sua chamada de API/Autenticação
      navigate("/dashboard");
    }
  };

  return (
    <div className="w-full max-w-sm flex flex-col gap-6">
      <TabToggle activeTab={mode} onChange={onToggleMode} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === "register" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#cdd6f4]">Nome completo</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className="w-full px-4 py-2 rounded-xl bg-[#313244] text-[#cdd6f4] border border-transparent focus:border-[#cba6f7] outline-none transition-all text-sm"
            />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#cdd6f4]">E-mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full px-4 py-2 rounded-xl bg-[#313244] text-[#cdd6f4] border border-transparent focus:border-[#cba6f7] outline-none transition-all text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#cdd6f4]">Senha</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2 rounded-xl bg-[#313244] text-[#cdd6f4] border border-transparent focus:border-[#cba6f7] outline-none transition-all text-sm"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 mt-2 rounded-xl bg-[#cba6f7] text-[#11111b] font-semibold text-sm hover:bg-[#b4befe] transition-all cursor-pointer"
        >
          {mode === "login" ? "Entrar" : "Criar conta"}
        </button>
      </form>

      <p className="text-center text-xs text-[#a6adc8]">
        {mode === "login" ? "Não possui uma conta? " : "Já possui uma conta? "}
        <button
          type="button"
          onClick={() => onToggleMode(mode === "login" ? "register" : "login")}
          className="text-[#cba6f7] hover:underline font-medium cursor-pointer"
        >
          {mode === "login" ? "Cadastre-se" : "Faça login"}
        </button>
      </p>
    </div>
  );
}