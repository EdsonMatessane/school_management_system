import { getInstitutionProfile } from '../services/api';
import { schoolProfileKey } from './institution';
import defaultLogo from '../assets/logo.png';

const toDataUrl = async (url) => {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const readLocal = () => {
  try {
    const profile = JSON.parse(window.localStorage.getItem(schoolProfileKey()) || '{}');
    return profile && typeof profile === 'object' && !Array.isArray(profile) ? profile : {};
  } catch {
    return {};
  }
};

/** Nome, slogan e logótipo para o cartão: os mesmos do report header (servidor, depois navegador). */
export async function loadCardInstitution() {
  const { profile, logo } = await loadReportHeader();
  return { name: profile.institutionName, slogan: profile.institutionSlogan, logo };
}

/**
 * Dados do report header e do report footer. Vêm do servidor (portais de estudante e de
 * funcionário não têm o armazenamento do administrador); o do navegador serve de reserva.
 */
export async function loadReportHeader() {
  const remote = await getInstitutionProfile().catch(() => ({}));
  const local = readLocal();
  let logo = remote.logo || window.localStorage.getItem('cacoin.logo') || '';
  if (!logo) {
    try {
      logo = await toDataUrl(defaultLogo);
    } catch {
      logo = '';
    }
  }
  return {
    profile: {
      institutionName: remote.name || local.institutionName || '',
      institutionSlogan: remote.slogan || local.institutionSlogan || '',
      institutionAddress: remote.address || local.institutionAddress || '',
      institutionPrimaryPhone: remote.primaryPhone || local.institutionPrimaryPhone || '',
      institutionEmail: remote.email || local.institutionEmail || '',
      institutionWebsite: remote.website || local.institutionWebsite || '',
    },
    footer: remote.reportFooter || window.localStorage.getItem('cacoin.schoolReportFooter') || '',
    logo,
  };
}
