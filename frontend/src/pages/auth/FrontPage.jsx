import { ArrowRight, ExternalLink } from 'lucide-react';
import { websiteHref } from '../../utils/website';

// !important: os botões têm de ficar brancos por cima de qualquer site e do tema da aplicação.
const styles = `
.cacoin-frontpage-actions {
  position: fixed;
  top: 50%;
  right: 24px;
  transform: translateY(-50%);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}
.cacoin-frontpage-actions .cacoin-frontpage-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: 1px solid rgba(0, 0, 0, 0.12) !important;
  border-radius: 999px;
  background: #ffffff !important;
  color: #052e5e !important;
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.2;
  text-decoration: none;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.28);
}
.cacoin-frontpage-actions .cacoin-frontpage-button:hover { background: #eef3f9 !important; }
.cacoin-frontpage-actions .cacoin-frontpage-button:focus-visible { outline: 3px solid #1976d2; outline-offset: 2px; }
.cacoin-frontpage-actions .cacoin-frontpage-primary { padding: 12px 26px; font-size: 16px; font-weight: 700; }
`;

/**
 * Página inicial: mostra o website da instituição em ecrã inteiro, com botões flutuantes (a meio,
 * no canto direito) e «Prosseguir» leva ao login. Se o website não permitir ser mostrado aqui
 * dentro, «Abrir website» abre-o à parte.
 */
export default function FrontPage({ website, onProceed }) {
  const href = websiteHref(website);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#fff' }}>
      <style>{styles}</style>
      <iframe
        title="Website da instituição"
        src={href}
        referrerPolicy="no-referrer"
        allow="fullscreen"
        style={{ border: 0, width: '100%', height: '100%', display: 'block' }}
      />
      <div className="cacoin-frontpage-actions">
        <a
          className="cacoin-frontpage-button"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={16} /> Abrir website
        </a>
        <button
          type="button"
          autoFocus
          className="cacoin-frontpage-button cacoin-frontpage-primary"
          onClick={onProceed}
        >
          Prosseguir <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
