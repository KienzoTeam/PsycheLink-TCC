import type { AuthMode } from "../../../types/auth";

const SPRING_EASE = "ease-out-expo";
const SMOOTH_EASE = "ease-in-out-expo";

export interface TabToggleProps {
  mode: AuthMode;
  onChange: (mode: AuthMode) => void;
}

/**
 * Alternador de aba Login/Cadastro com indicador animado (morph) atrás da
 * aba ativa.
 */
export function TabToggle({ mode, onChange }: TabToggleProps) {
  return (
    <div
      className="relative mb-6 flex rounded-xl bg-surface p-1"
      role="tablist"
      aria-label="Modo de autenticação"
    >
      <div
        aria-hidden="true"
        className={`absolute left-1 top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-lg bg-background shadow-xs transition-all duration-500 ${SMOOTH_EASE} ${
          mode === "register" ? "translate-x-full" : ""
        }`}
      />
      <button
        type="button"
        role="tab"
        aria-selected={mode === "login"}
        onClick={() => onChange("login")}
        className={`relative z-10 flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-300 ${SPRING_EASE} ${
          mode === "login" ? "text-primary" : "text-subtext hover:text-text"
        }`}
      >
        Entrar
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "register"}
        onClick={() => onChange("register")}
        className={`relative z-10 flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-300 ${SPRING_EASE} ${
          mode === "register" ? "text-primary" : "text-subtext hover:text-text"
        }`}
      >
        Cadastro
      </button>
    </div>
  );
}
