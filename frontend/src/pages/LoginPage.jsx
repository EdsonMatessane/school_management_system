import { ArrowRight } from 'lucide-react';

export default function LoginPage({ onContinue }) {
  return (
    <main className="cacoin-entry">
      <section className="cacoin-entry-card" aria-labelledby="cacoin-title">
        <div className="cacoin-entry-mark" aria-hidden="true">c</div>
        <h1 id="cacoin-title">Cacoin</h1>
        <button type="button" className="cacoin-continue" onClick={onContinue}>
          Continuar
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </section>
    </main>
  );
}
