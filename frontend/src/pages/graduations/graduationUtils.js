export const graduationStatusLabels = {
  PAYMENT_PENDING: 'Pagamento pendente',
  ENROLLED: 'Inscrito',
  GRADUATED: 'Graduado',
  FORMED: 'Formado',
};

export const graduationStatusClass = (status) => (
  status === 'PAYMENT_PENDING' || status === 'ENROLLED' ? 'pending' : 'paid'
);

export const formatDuration = (months) => {
  if (!months) return '';
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years > 0) {
    const yearLabel = `${years} ${years === 1 ? 'ano' : 'anos'}`;
    if (remainingMonths === 0) return yearLabel;
    const monthLabel = `${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}`;
    return `${yearLabel} e ${monthLabel}`;
  }
  return `${months} ${months === 1 ? 'mês' : 'meses'}`;
};

export const quoteGraduation = (settings, guests) => {
  if (!settings) {
    return { fee: 0, requirements: 0, extraGuests: 0, extraGuestsAmount: 0, total: 0, ready: false };
  }
  const fee = settings.graduationFeeActive ? Number(settings.graduationFee) : 0;
  const extraFee = settings.extraGuestFeeActive ? Number(settings.extraGuestFee) : 0;
  const requirements = Number(settings.requirementsTotal || 0);
  const extraGuests = Math.max(0, guests - Number(settings.includedGuests));
  const extraGuestsAmount = extraFee * extraGuests;
  return {
    fee,
    requirements,
    extraGuests,
    extraGuestsAmount,
    total: fee + requirements + extraGuestsAmount,
    ready: fee > 0 && (extraGuests === 0 || extraFee > 0),
    missingExtraFee: extraGuests > 0 && extraFee <= 0,
  };
};

export const errorMessage = (error) =>
  error.response?.data?.message || error.message || 'Não foi possível concluir a operação.';
