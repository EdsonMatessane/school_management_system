import { useMemo, useState } from 'react';
import { Button } from '@mui/material';
import { Download, RotateCw } from 'lucide-react';
import { nameTier } from '../utils/cardData';
import { qrMatrix } from '../utils/qrcode';
import './digital-card.css';

function Qr({ text }) {
  const matrix = useMemo(() => qrMatrix(text), [text]);
  const size = matrix.length;
  return (
    <div className="dcard-qr" title="Código de validação">
      <svg viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" role="img" aria-label="Código QR de validação">
        {matrix.flatMap((row, y) => row.map((dark, x) => (
          dark ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#0f172a" /> : null
        )))}
      </svg>
    </div>
  );
}

/**
 * Cartão digital (estudante ou funcionário): clique para virar. O PDF tem o tamanho de um
 * cartão (85,6 × 54 mm), frente e verso, pronto a imprimir.
 */
export default function DigitalCard({ card, showDownload = true, onDownloaded }) {
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState('');
  const style = {
    '--dc-bg': card.theme.bg, '--dc-bg2': card.theme.bg2, '--dc-accent': card.theme.accent,
    '--dc-ink': card.theme.ink, '--dc-muted': card.theme.muted,
  };

  const download = async () => {
    try {
      setError('');
      // jsPDF só se carrega quando se descarrega (o resto do sistema também o carrega a pedido)
      const { exportCardToPdf } = await import('../utils/cardPdf');
      exportCardToPdf(card);
      if (onDownloaded) onDownloaded();
    } catch (downloadError) {
      setError(downloadError.message || 'Não foi possível gerar o cartão.');
    }
  };

  return (
    <div className="dcard-wrap" style={style}>
      <div className="dcard-scene">
        <button
          type="button"
          className={`dcard${flipped ? ' flipped' : ''}`}
          onClick={() => setFlipped((value) => !value)}
          aria-label={flipped ? 'Ver a frente do cartão' : 'Ver o verso do cartão'}
        >
          <div className="dcard-face dcard-front">
            <div className="dcard-inner">
            <div className="dcard-head">
              <div className="dcard-brand">
                {card.logo && <img className="dcard-logo" src={card.logo} alt="" />}
                <div className="dcard-brandtext">
                  <span className="dcard-inst">{card.institutionName}</span>
                  {card.subtitle && <span className="dcard-sub">{card.subtitle}</span>}
                </div>
              </div>
              <span className="dcard-badge">{card.badge}</span>
            </div>
            <div className="dcard-body">
              <div className="dcard-photo">
                <div className="dcard-avatar">
                  {card.photo
                    ? <img className="dcard-photo-img" src={card.photo} alt="" />
                    : (card.initials || '?')}
                </div>
                <span className="dcard-status">{card.status}</span>
              </div>
              <div className="dcard-info">
                <div>
                  <span className="dcard-label">{card.numberLabel}:</span>
                  <span className="dcard-value dcard-number">{card.number}</span>
                </div>
                <div>
                  <span className="dcard-label">Nome:</span>
                  <span
                    className="dcard-value dcard-name"
                    style={{ fontSize: `${[3.2, 2.9, 2.5][nameTier(card.name)]}cqw` }}
                  >
                    {card.name}
                  </span>
                </div>
                <div className="dcard-grid">
                  {card.fields.map((field) => (
                    <div key={field.label} className={field.wide ? 'wide' : ''}>
                      <span className="dcard-label">{field.label}:</span>
                      <span className="dcard-value">{field.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </div>
            <div className="dcard-foot">
              <span className={`dcard-chip ${card.theme.chip}`} aria-hidden="true" />
              <span>{card.footerLeft.label}: <b>{card.footerLeft.value}</b></span>
              <span>{card.footerRight.label}: <b>{card.footerRight.value}</b></span>
            </div>
          </div>

          <div className="dcard-face dcard-back">
            <div className="dcard-stripe" />
            <div className="dcard-back-mid">
              <div className="dcard-sign">
                <span className="dcard-label">Assinatura do titular</span>
                <div className="dcard-signbox">{card.name}</div>
              </div>
              <div>
                <Qr text={card.qrText} />
                <span className="dcard-status" style={{ display: 'block' }}>VALIDAÇÃO</span>
              </div>
            </div>
            <p className="dcard-notice">
              Este cartão é pessoal e intransmissível, constituindo propriedade exclusiva da
              instituição emissora. Deve ser apresentado sempre que solicitado. Em caso de
              extravio, o titular deve comunicar de imediato aos serviços da instituição.
            </p>
            <div className="dcard-back-foot">
              <span>{card.institutionName.toUpperCase()}</span>
              <span>EMISSÃO OFICIAL</span>
            </div>
          </div>
        </button>
      </div>
      <div className="dcard-actions">
        <Button variant="outlined" startIcon={<RotateCw size={16} />} onClick={() => setFlipped((value) => !value)}>
          {flipped ? 'Ver frente' : 'Ver verso'}
        </Button>
        {showDownload && (
          <Button variant="contained" startIcon={<Download size={16} />} onClick={download}>
            Descarregar cartão (PDF)
          </Button>
        )}
      </div>
      {error && <p className="portal-error">{error}</p>}
    </div>
  );
}
