import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { dismissWelcome, getWelcome } from '../services/api';
import { welcomeContent } from './welcomeContent';

/**
 * Nota de boas-vindas do primeiro acesso (todos os tipos de utilizador). O servidor diz se
 * está pendente; ao fechar, fica registada como vista e não volta a aparecer.
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
    return () => { active = false; };
  }, []);

  const close = () => {
    setOpen(false);
    dismissWelcome().catch(() => {});
  };

  const content = welcome ? welcomeContent[welcome.audience] ?? welcomeContent.other : null;
  if (!content) return null;
  const firstName = (welcome.name ?? '').split(' ')[0];

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle>{content.title}{firstName ? `, ${firstName}` : ''}!</DialogTitle>
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
        <Button variant="contained" onClick={close}>Começar</Button>
      </DialogActions>
    </Dialog>
  );
}
