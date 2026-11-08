const API_BASE_KEY = 'cacoin.apiBase';
const INSTITUTIONS_KEY = 'cacoin.institutions';
const PROFILE_KEY = 'cacoin.schoolProfile';

export const defaultApiBase = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

/** Backend da instituição escolhida no ecrã de entrada (o principal por omissão). */
export const getApiBase = () => {
  try {
    return window.localStorage.getItem(API_BASE_KEY) || defaultApiBase;
  } catch {
    return defaultApiBase;
  }
};

export const setApiBase = (base) => {
  try {
    if (!base || base === defaultApiBase) window.localStorage.removeItem(API_BASE_KEY);
    else window.localStorage.setItem(API_BASE_KEY, base);
  } catch {
    // sem armazenamento: fica o sistema principal
  }
};

export const isPartitionBase = () => getApiBase() !== defaultApiBase;

/** O perfil da escola é guardado por instituição, para não se misturarem. */
export const schoolProfileKey = () => (
  isPartitionBase() ? `${PROFILE_KEY}:${getApiBase()}` : PROFILE_KEY
);

export const readInstitutionOptions = () => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(INSTITUTIONS_KEY) ?? '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
};

export const saveInstitutionOptions = (options) => {
  try {
    window.localStorage.setItem(INSTITUTIONS_KEY, JSON.stringify(options));
  } catch {
    // a lista volta a ser pedida ao sistema principal
  }
};
