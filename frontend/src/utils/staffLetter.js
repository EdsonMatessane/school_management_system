import { welcomeContent } from '../components/welcomeContent';
import { toDisplayDate } from './date';
import { startLetter } from './letterKit';
import { websiteLabel } from './website';

const types = {
  teachers: { audience: 'teacher', label: 'Professor' },
  hr: { audience: 'hr', label: 'Recursos Humanos' },
  other: { audience: 'other', label: 'Funcionário' },
};

/** Carta de boas-vindas do funcionário (professor, RH ou outro), com o report header e footer. */
export async function exportStaffLetter(staff) {
  const type = types[staff.staffType] ?? types.other;
  const code = String(staff.staffCode ?? '').toUpperCase();
  const name = [staff.firstName, staff.surname].filter(Boolean).join(' ');
  const letter = await startLetter({ title: 'Carta de boas-vindas', ref: code });

  letter.paragraph(`Caro(a) colega ${name},`, { bold: true });
  letter.paragraph(
    `É com muito gosto que lhe damos as boas-vindas à nossa equipa (${letter.institution}). `
    + 'Nesta carta encontra os seus dados de funcionário, as credenciais de acesso ao sistema e '
    + 'um resumo do que pode fazer nele.',
    { gap: 4 },
  );

  letter.section('1. Dados do funcionário', [
    ['Código', code],
    ['Nome', name],
    ['Tipo', type.label],
    ['Cargo', staff.positionName || '—'],
    ['Data de nascimento', staff.birthDate ? toDisplayDate(staff.birthDate) : '—'],
    ['Registado em', staff.createdAt ? toDisplayDate(String(staff.createdAt).slice(0, 10)) : '—'],
  ]);

  letter.section('2. Credenciais de acesso ao sistema', [
    ['Endereço do sistema', websiteLabel(window.location.origin)],
    ['Utilizador', code],
    ['Palavra-passe inicial', 'O número de telefone indicado no registo, sem o prefixo +258'],
  ]);
  letter.paragraph(
    'No primeiro acesso o sistema pede-lhe que defina uma palavra-passe pessoal, que substitui a '
    + 'inicial. Guarde-a em segurança e não a partilhe com ninguém. Se se esquecer dela, contacte a secretaria.',
    { gap: 5 },
  );

  const steps = (welcomeContent[type.audience] ?? welcomeContent.other).steps;
  letter.grid('3. O que pode fazer no sistema', steps, 48);
  letter.closing('Desejamos-lhe um excelente trabalho.');
  letter.save(`carta-boas-vindas-${code}.pdf`);
}
