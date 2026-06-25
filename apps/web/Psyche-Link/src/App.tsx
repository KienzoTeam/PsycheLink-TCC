import logoImg from "./assets/logo.png";

const features = [
  {
    label: "Check-in diário",
    desc: "Emoções, sono e hábitos em menos de 3 minutos",
  },
  {
    label: "Escalas clínicas",
    desc: "PHQ-9, GAD-7 e DASS-21 validados para o Brasil",
  },
  {
    label: "Dashboard analítico",
    desc: "Dados organizados para subsidiar a sessão terapêutica",
  },
];

function App() {
  return (
    <main className="min-h-screen bg-background font-sans text-text">
      <section className="flex flex-col items-center px-6 pb-12 pt-8 text-center">
        <span className="mb-5 inline-flex items-center rounded-pill bg-surface px-4 py-1.5 text-sm text-subtext">
          Apoio psicológico contínuo
        </span>
        <div className="flex flex-col items-center gap-3">
          <img src={logoImg} className="h-24" alt="Logo do PsycheLink" />
          <h1 className="font-serif italic text-5xl font-bold tracking-tight text-primary">
            PsycheLink
          </h1>
        </div>

        <p className="mt-4 max-w-md text-lg leading-relaxed text-subtext">
          Check-ins diários, escalas clínicas e vínculo terapêutico — conectando
          pacientes a psicólogos.
        </p>

        <div className="mt-8 flex gap-3">
          <button className="rounded-pill bg-primary px-6 py-2.5 text-sm font-semibold text-mocha-base transition-opacity hover:opacity-90">
            Acessar plataforma
          </button>
          <button className="rounded-pill border border-surface px-6 py-2.5 text-sm font-semibold text-subtext transition-colors hover:bg-surface">
            Saiba mais
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto grid max-w-2xl grid-cols-1 gap-4 px-6 sm:grid-cols-3">
        {features.map((f) => (
          <div key={f.label} className="rounded-xl bg-surface px-5 py-4">
            <p className="font-semibold text-text">{f.label}</p>
            <p className="mt-1 text-sm text-subtext">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}

export default App;
