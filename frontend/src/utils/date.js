export const maskDate = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

export const parseDisplayDate = (value) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    date.getFullYear() !== Number(year)
    || date.getMonth() !== Number(month) - 1
    || date.getDate() !== Number(day)
  ) {
    return null;
  }
  return `${year}-${month}-${day}`;
};

export const toDisplayDate = (value) => {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};

export const isValidDisplayDate = (value) => !value || parseDisplayDate(value) !== null;


const pad = (number) => String(number).padStart(2, '0');

export const isoDate = (date = new Date()) => (
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
);

export const maskDateTime = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  const date = maskDate(digits.slice(0, 8));
  if (digits.length <= 8) return date;
  const time = digits.slice(8);
  return `${date} ${time.length <= 2 ? time : `${time.slice(0, 2)}:${time.slice(2)}`}`;
};

export const parseDisplayDateTime = (value) => {
  const match = /^(\d{2}\/\d{2}\/\d{4}) (\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const date = parseDisplayDate(match[1]);
  if (!date || Number(match[2]) > 23 || Number(match[3]) > 59) return null;
  return `${date}T${match[2]}:${match[3]}`;
};

export const toDisplayDateTime = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(value || '');
  return match ? `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}` : '';
};

const maputoParts = (date) => {
  const found = {};
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Maputo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date).forEach(({ type, value }) => {
    found[type] = value;
  });
  return { ...found, hour: found.hour === '24' ? '00' : found.hour };
};

const readDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const { year, month, day, hour, minute } = maputoParts(value);
    return { year, month, day, hour, minute };
  }
  const text = String(value);
  const plain = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?(?:[:.]\d+)?$/.exec(text);
  if (plain) {
    return { year: plain[1], month: plain[2], day: plain[3], hour: plain[4] ?? null, minute: plain[5] ?? null };
  }
  return readDate(new Date(text));
};

export const formatDate = (value, empty = '—') => {
  const parts = readDate(value);
  return parts ? `${parts.day}/${parts.month}/${parts.year}` : empty;
};

export const formatDateTime = (value, empty = '—') => {
  const parts = readDate(value);
  if (!parts) return empty;
  const date = `${parts.day}/${parts.month}/${parts.year}`;
  return parts.hour === null ? date : `${date} ${parts.hour}:${parts.minute}`;
};

export const formatTime = (value, empty = '—') => {
  const parts = readDate(value);
  return parts && parts.hour !== null ? `${parts.hour}:${parts.minute}` : empty;
};
