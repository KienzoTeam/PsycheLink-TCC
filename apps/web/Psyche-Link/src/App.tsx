import { useState, useRef, useEffect } from "react";
import logoImg from "./assets/logo.png";

type AuthMode = "login" | "register";

const spring = "ease-out-expo";
const smooth = "ease-in-out-expo";

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShow(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, show };
}

function App() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { ref: brandRef, show } = useReveal();

  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setHeight(entry.contentRect.height);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [mode, errors]);

  const toggleMode = (m: AuthMode) => {
    setMode(m);
    setErrors({});
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (mode === "register" && !name.trim())
      errs.name = "Informe seu nome completo";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "Email inválido";
    if (password.length < 6) errs.password = "Mínimo de 6 caracteres";
    if (mode === "register" && password !== confirmPassword)
      errs.confirmPassword = "As senhas não conferem";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => setLoading(false), 1200);
  };

  const fieldStyle = (hasError: boolean) =>
    `w-full rounded-xl bg-surface px-4 py-2.5 text-text outline-none transition-all duration-500 ${smooth} placeholder:text-subtext/50 focus:ring-2 focus:ring-primary/40 ${
      hasError ? "ring-2 ring-mocha-red/40" : ""
    }`;

  return (
    <div className="flex min-h-dvh flex-col font-sans text-text lg:flex-row">
      {/* Brand side */}
      <aside
        ref={brandRef}
        className="flex flex-1 items-center justify-center bg-surface p-8 lg:justify-start lg:pl-16"
      >
        <div
          className={`flex flex-col items-center gap-4 transition-all duration-1000 ${smooth} lg:items-start ${
            show
              ? "translate-y-0 opacity-100 blur-0"
              : "translate-y-10 opacity-0 blur-sm"
          }`}
        >
          <img
            src={logoImg}
            className="h-24 w-24 drop-shadow-[0_0_16px_#cba6f7]/30 lg:h-32 lg:w-32"
            alt="PsycheLink"
          />
          <div className="flex flex-col items-center gap-1 lg:items-start">
            <h1 className="font-serif text-5xl leading-[0.95] tracking-tight text-primary lg:text-6xl italic">
              PsycheLink
            </h1>
            <p className="max-w-sm text-center text-base leading-relaxed text-subtext text-balance lg:text-left">
              Check-ins diários, escalas clínicas e vínculo terapêutico —
              conectando pacientes a psicólogos.
            </p>
          </div>
        </div>
      </aside>

      {/* Form side */}
      <main className="flex flex-1 items-center justify-center bg-background p-6">
        <div
          className="w-full max-w-sm"
            style={{
              animation:
                "fadeSlideIn 0.9s var(--ease-in-out-expo) 0.15s both",
            }}
          >
            {/* Tab toggle with morph indicator */}
            <div
              className="relative mb-6 flex rounded-xl bg-surface p-1"
              role="tablist"
              aria-label="Modo de autenticação"
              style={{
                animation:
                  "fadeSlideIn 0.6s var(--ease-in-out-expo) 0.25s both",
              }}
          >
            <div
              className={`absolute left-1 top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-lg bg-background shadow-xs transition-all duration-500 ${smooth} ${
                mode === "register" ? "translate-x-full" : ""
              }`}
            />
            <button
              role="tab"
              aria-selected={mode === "login"}
              onClick={() => toggleMode("login")}
              className={`relative z-10 flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-300 ${spring} ${
                mode === "login"
                  ? "text-primary"
                  : "text-subtext hover:text-text"
              }`}
            >
              Entrar
            </button>
            <button
              role="tab"
              aria-selected={mode === "register"}
              onClick={() => toggleMode("register")}
              className={`relative z-10 flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-300 ${spring} ${
                mode === "register"
                  ? "text-primary"
                  : "text-subtext hover:text-text"
              }`}
            >
              Cadastro
            </button>
          </div>

          {/* Form com altura animada */}
          <form onSubmit={handleSubmit} noValidate>
            <div
              className="transition-all duration-500 ease-in-out-expo"
              style={{ height: height ? `${height}px` : "auto" }}
            >
              <div className="space-y-4" key={mode} ref={contentRef}>
                {mode === "register" && (
                  <div
                    style={{
                      animation:
                        "fadeSlideIn 0.5s var(--ease-in-out-expo) 0.1s both",
                    }}
                  >
                    <label
                      htmlFor="name"
                      className="mb-1.5 block text-sm font-medium text-subtext"
                    >
                      Nome completo
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome"
                      autoComplete="name"
                      className={fieldStyle(!!errors.name)}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-mocha-red" role="alert">
                        {errors.name}
                      </p>
                    )}
                  </div>
                )}

                <div
                  style={{
                    animation:
                      "fadeSlideIn 0.5s var(--ease-in-out-expo) 0.2s both",
                  }}
                >
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium text-subtext"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    autoComplete="email"
                    className={fieldStyle(!!errors.email)}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-mocha-red" role="alert">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div
                  style={{
                    animation:
                      "fadeSlideIn 0.5s var(--ease-in-out-expo) 0.3s both",
                  }}
                >
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-sm font-medium text-subtext"
                  >
                    Senha
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    className={fieldStyle(!!errors.password)}
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-mocha-red" role="alert">
                      {errors.password}
                    </p>
                  )}
                </div>

                {mode === "login" && (
                  <div
                    className="flex justify-end"
                    style={{
                      animation:
                        "fadeSlideIn 0.5s var(--ease-in-out-expo) 0.4s both",
                    }}
                  >
                    <button
                      type="button"
                      className="text-xs text-subtext transition-colors duration-300 hover:text-text"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                )}

                {mode === "register" && (
                  <div
                    style={{
                      animation:
                        "fadeSlideIn 0.5s var(--ease-in-out-expo) 0.4s both",
                    }}
                  >
                    <label
                      htmlFor="confirmPassword"
                      className="mb-1.5 block text-sm font-medium text-subtext"
                    >
                      Confirmar senha
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className={fieldStyle(!!errors.confirmPassword)}
                    />
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-mocha-red" role="alert">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-mocha-base transition-all duration-500 ease-in-out-expo hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    animation:
                      "fadeSlideIn 0.5s var(--ease-in-out-expo) 0.5s both",
                  }}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <svg
                        className="size-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      {mode === "login" ? "Entrando..." : "Cadastrando..."}
                    </span>
                  ) : mode === "login" ? (
                    "Entrar"
                  ) : (
                    "Criar conta"
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default App;
