import { useCallback, useEffect, useState } from 'react';

export const errorMessage = (error) => (
  error.response?.data?.message || error.message || 'Não foi possível carregar os dados.'
);

export const usePortalData = (loader) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await loader());
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
};

export const initials = (name) => (name ?? '')
  .split(' ').filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');

export const chargeTone = (charge) => {
  if (Number(charge.balance) <= 0) return { label: 'Pago', tone: 'paid' };
  if (charge.overdue) return { label: 'Em atraso', tone: 'rejected' };
  if (Number(charge.paidAmount) > 0) return { label: 'Parcial', tone: 'pending' };
  return { label: 'Por pagar', tone: 'pending' };
};

export const attendanceLabel = (record) => {
  if (record.status !== 'ABSENT') return { label: 'Presente', tone: 'paid' };
  if (record.justification === 'JUSTIFIED') return { label: 'Falta justificada', tone: 'pending' };
  if (record.justification === 'PAYMENT_PENDING') return { label: 'Justificação por pagar', tone: 'pending' };
  return { label: 'Falta', tone: 'rejected' };
};

export const portalThemes = ['blue', 'green', 'purple', 'dark'];

const themeKey = (code) => (code ? `cacoin.portal.theme.${code}` : 'cacoin.portal.theme');

export const readPortalTheme = (code) => {
  try {
    const stored = window.localStorage.getItem(themeKey(code))
      ?? (code ? null : window.localStorage.getItem('cacoin.portal.theme'));
    return portalThemes.includes(stored) ? stored : null;
  } catch {
    return null;
  }
};

export const savePortalTheme = (code, theme) => {
  try {
    window.localStorage.setItem(themeKey(code), theme);
    window.localStorage.setItem(themeKey(null), theme);
  } catch {
    // o navegador não permite guardar; o tema volta ao padrão na próxima sessão
  }
};

const seenKey = (code) => `cacoin.portal.notifications.${code || 'student'}`;

export const readSeenNotifications = (code) => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(seenKey(code)) ?? '[]');
    return new Set(Array.isArray(stored) ? stored : []);
  } catch {
    return new Set();
  }
};

export const saveSeenNotifications = (code, seen) => {
  try {
    window.localStorage.setItem(seenKey(code), JSON.stringify([...seen].slice(-600)));
  } catch {
    // o navegador não permite guardar; as notificações voltam a aparecer como novas
  }
};
