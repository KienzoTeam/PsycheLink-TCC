import logoImg from "../../../assets/logo.webp";
import { useReveal } from "../../../hooks/useReveal";

const SMOOTH_EASE = "ease-in-out-expo";

export function BrandPanel() {
  const { ref, show } = useReveal<HTMLDivElement>();

  return (
    <aside
      ref={ref}
      className="flex flex-1 items-center justify-center bg-surface p-8 lg:justify-start lg:pl-16"
    >
      <div
        className={`flex flex-col items-center gap-4 transition-all duration-1000 ${SMOOTH_EASE} lg:items-start ${
          show ? "translate-y-0 opacity-100 blur-0" : "translate-y-10 opacity-0 blur-sm"
        }`}
      >
        <img
          src={logoImg}
          className="h-24 w-24 drop-shadow-[0_0_16px_#cba6f7]/30 lg:h-32 lg:w-32"
          alt="PsycheLink"
        />
        <div className="flex flex-col items-center gap-1 lg:items-start">
          <h1 className="font-serif text-5xl leading-[0.95] tracking-tight text-primary italic lg:text-6xl">
            PsycheLink
          </h1>
          <p className="max-w-sm text-center text-base leading-relaxed text-subtext text-balance lg:text-left">
            Check-ins diários, escalas clínicas e vínculo terapêutico —
            conectando pacientes a psicólogos.
          </p>
        </div>
      </div>
    </aside>
  );
}