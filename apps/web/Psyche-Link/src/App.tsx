import heroImg from "./assets/hero.png";

function App() {
  return (
    <main className="bg-mocha-base text-mocha-text min-h-screen bg-base text-text">
      <section className="flex flex-col items-center px-4 pt-10">
        <h1 className="text-4xl font-bold text-center text-primary">
          PsycheLink
        </h1>
        <p className="text-center mt-4 text-lg text-subtext1 max-w-md">
          Check-ins diários, escalas clínicas e vínculo terapêutico — conectando
          pacientes a psicólogos.
        </p>
        <div className="flex justify-center mt-6 w-full max-w-2xl">
          <img
            src={heroImg}
            alt="Dashboard do PsycheLink mostrando check-in diário"
            className="w-20 rounded-lg shadow-lg"
          />
        </div>
      </section>
    </main>
  );
}

export default App;
