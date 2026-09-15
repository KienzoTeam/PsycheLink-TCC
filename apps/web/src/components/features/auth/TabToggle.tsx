import React from "react";
import type { AuthMode } from "../../../types/auth";

interface TabToggleProps {
  activeTab: AuthMode;
  onChange: (tab: AuthMode) => void;
}

export const TabToggle: React.FC<TabToggleProps> = ({ activeTab, onChange }) => {
  return (
    <div className="flex bg-[#181825] p-1 rounded-2xl border border-[#313244]">
      <button
        type="button"
        onClick={() => onChange("login")}
        className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all ${
          activeTab === "login"
            ? "bg-[#313244] text-[#cba6f7] shadow-sm font-semibold"
            : "text-[#a6adc8] hover:text-[#cdd6f4]"
        }`}
      >
        Entrar
      </button>
      <button
        type="button"
        onClick={() => onChange("register")}
        className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all ${
          activeTab === "register"
            ? "bg-[#313244] text-[#cba6f7] shadow-sm font-semibold"
            : "text-[#a6adc8] hover:text-[#cdd6f4]"
        }`}
      >
        Cadastrar
      </button>
    </div>
  );
};