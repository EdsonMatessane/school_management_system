import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { dismissWelcome, getWelcome } from '../services/api';
import { welcomeContent } from './welcomeContent';

const OPEN_EVENT = 'cacoin:open-welcome';

/** Volta a abrir a nota «Como usar o sistema» (menu de ajuda de cada portal). */
export const openWelcomeGuide = () => window.dispatchEvent(new Event(OPEN_EVENT));

/**
 * Nota de boas-vindas. Abre sozinha no primeiro acesso (o servidor diz se está pendente; ao
 * fechar fica registada como vista) e pode ser aberta quando se quiser em «Como usar o sistema».
 */
export default function WelcomeDialog({ onOpenDocuments }) {
  const [welcome, setWelcome] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    getWelcome()
      .then((result) => {
        if (!active || !result?.pending) return;
        setWelcome(result);
        setOpen(true);
      })
      .catch(() => {});
    const reopen = () => {
      getWelcome()
        .then((result) => { if (active && result) { setWelcome(result); setOpen(true); } })
        .catch(() => {});
    };
    window.addEventListener(OPEN_EVENT, reopen);
    return () => {
      active = false;
      window.removeEventListener(OPEN_EVENT, reopen);
    };
  }, []);

  const close = () => {
    setOpen(false);
    if (welcome?.pending) {
      dismissWelcome().catch(() => {});
      setWelcome({ ...welcome, pending: false });
    }
  };

  const content = welcome ? welcomeContent[welcome.audience] ?? welcomeContent.other : null;
  if (!content) return null;
  const firstName = (welcome.name ?? '').split(' ')[0];

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle>{content.title}{welcome.pending && firstName ? `, ${firstName}` : ''}!</DialogTitle>
      <DialogContent dividers>
        {welcome.institutionName && (
          <p style={{ marginTop: 0 }}><strong>{welcome.institutionName}</strong></p>
        )}
        <p style={{ marginTop: 0 }}>{content.intro}</p>
        <ol style={{ paddingLeft: 20, display: 'grid', gap: 10 }}>
          {content.steps.map(([title, text]) => (
            <li key={title}><strong>{title}.</strong> {text}</li>
          ))}
        </ol>
        <p style={{ marginBottom: 4 }}><strong>Boas práticas</strong></p>
        <ul style={{ marginTop: 0, paddingLeft: 20 }}>
          {content.tips.map((tip) => <li key={tip}>{tip}</li>)}
          <li>Mantenha a sua palavra-passe em segredo e não a partilhe com ninguém.</li>
        </ul>
      </DialogContent>
      <DialogActions>
        {onOpenDocuments && welcome.audience === 'student' && (
          <Button onClick={() => { close(); onOpenDocuments(); }}>Ver cartão e carta</Button>
        )}
        <Button variant="contained" onClick={close}>{welcome.pending ? 'Começar' : 'Fechar'}</Button>
      </DialogActions>
    </Dialog>
  );
}
