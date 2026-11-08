import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, IconButton, Tooltip } from '@mui/material';
import { Minus, Square, X } from 'lucide-react';

/**
 * Painel flutuante: não bloqueia o ecrã, pode ser arrastado pela barra de título
 * (clicar e arrastar) e minimizado. Pode ser aberto sobre outro diálogo.
 */
export default function FloatingPanel({
  open,
  title,
  onClose,
  children,
  width = 640,
  initialOffset = { x: 70, y: 50 },
}) {
  const [offset, setOffset] = useState(initialOffset);
  const [minimized, setMinimized] = useState(false);
  const drag = useRef(null);

  useEffect(() => {
    if (open) {
      setOffset(initialOffset);
      setMinimized(false);
    }
  }, [open]);

  const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));

  const startDrag = (event) => {
    if (event.target.closest('button')) return;
    drag.current = { x: event.clientX - offset.x, y: event.clientY - offset.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event) => {
    if (!drag.current) return;
    setOffset({
      x: clamp(event.clientX - drag.current.x, window.innerWidth / 2),
      y: clamp(event.clientY - drag.current.y, window.innerHeight / 2),
    });
  };

  const endDrag = (event) => {
    drag.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      hideBackdrop
      disableEnforceFocus
      disableAutoFocus
      disableRestoreFocus
      disableScrollLock
      aria-labelledby="cacoin-floating-panel-title"
      sx={{ pointerEvents: 'none', '& .MuiDialog-container': { pointerEvents: 'none' } }}
      slotProps={{
        paper: {
          sx: {
            pointerEvents: 'auto',
            m: 0,
            width: minimized ? 340 : width,
            maxWidth: '95vw',
            transform: `translate(${offset.x}px, ${offset.y}px)`,
            boxShadow: '0 12px 40px rgba(5, 46, 94, 0.35)',
          },
        },
      }}
    >
      <div
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '10px 8px 10px 20px',
          cursor: 'move',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        <h2
          id="cacoin-floating-panel-title"
          style={{ margin: 0, fontSize: '1.15rem', fontWeight: 500 }}
        >
          {title}
        </h2>
        <span>
          <Tooltip title={minimized ? 'Restaurar' : 'Minimizar'}>
            <IconButton
              size="small"
              aria-label={minimized ? 'Restaurar' : 'Minimizar'}
              onClick={() => setMinimized((current) => !current)}
            >
              {minimized ? <Square size={15} /> : <Minus size={17} />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Fechar">
            <IconButton size="small" aria-label="Fechar" onClick={onClose}>
              <X size={17} />
            </IconButton>
          </Tooltip>
        </span>
      </div>
      {!minimized && <DialogContent sx={{ pt: 0 }}>{children}</DialogContent>}
    </Dialog>
  );
}
