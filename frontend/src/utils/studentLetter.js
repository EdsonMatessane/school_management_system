import { toDisplayDate } from './date';
import { startLetter } from './letterKit';
import { websiteLabel } from './website';

const portalSections = [
  ['Dashboard', 'Resumo da sua situação: presenças, notas, saldo em dívida e actividade recente.'],
  ['Minha informação', 'Os seus dados pessoais e de inscrição, a alteração da palavra-passe e a escolha do tema.'],
  ['Cursos', 'Os módulos, as disciplinas e os professores do seu curso, e as suas inscrições em testes e exames.'],
  ['Aulas online', 'As aulas marcadas, a ligação para entrar e os materiais de apoio.'],
  ['Pagamentos', 'Mensalidades e taxas por pagar, em atraso e pagas, o saldo em dívida e o histórico de pagamentos.'],
  ['Notas e Pautas', 'As notas de testes e exames e as pautas do seu curso.'],
  ['Presenças', 'O registo de presenças e faltas, com o estado da justificação.'],
  ['Pedidos', 'Fazer pedidos à secretaria (com anexos) e acompanhar o estado de cada um.'],
  ['Serviços', 'O estado das suas encomendas de uniforme, da graduação e do trancamento.'],
  ['Notificações', 'Avisos da instituição, no sino do topo do ecrã e na secção própria.'],
  ['Cartão e carta', 'O seu cartão de estudante digital (com a sua fotografia) e esta carta, sempre disponíveis para descarregar.'],
];

const salutation = (gender, name) => {
  if (/^f/i.test(gender ?? '')) return `Exma. Sra. ${name},`;
  if (/^m/i.test(gender ?? '')) return `Exmo. Sr. ${name},`;
  return `Caro(a) estudante ${name},`;
};

const months = (value) => (value ? `${value} ${value === 1 ? 'mês' : 'meses'}` : '—');

/** Carta de boas-vindas do estudante, com o report header e o report footer da instituição. */
export async function exportStudentLetter(documents) {
  const letter = await startLetter({ title: 'Carta de boas-vindas', ref: documents.code });

  letter.paragraph(salutation(documents.gender, documents.name), { bold: true });
  letter.paragraph(
    `É com muito gosto que lhe damos as boas-vindas à nossa instituição (${letter.institution}). `
    + 'A sua inscrição foi registada com sucesso e, a partir de agora, faz parte da nossa '
    + 'comunidade de estudantes. Nesta carta encontra os detalhes do seu curso, as suas '
    + 'credenciais de acesso ao portal do estudante e um resumo do que pode fazer no sistema.',
    { gap: 4 },
  );

  letter.section('1. Dados da inscrição', [
    ['Código de estudante', documents.code],
    ['Nome', documents.name],
    ['Curso', documents.courseName],
    ['Categoria', documents.categoryName],
    ['Nível', documents.levelName],
    ['Modalidade', documents.modalityName],
    ['Data de inscrição', documents.enrollmentDate ? toDisplayDate(documents.enrollmentDate) : '—'],
    ['Duração', months(documents.durationMonths)],
    ['Data prevista de conclusão', documents.endDate ? toDisplayDate(documents.endDate) : '—'],
    ['Estado da matrícula', documents.enrollmentStatus],
  ]);

  letter.section('2. Credenciais de acesso ao portal', [
    ['Endereço do portal', websiteLabel(window.location.origin)],
    ['Utilizador', documents.code],
    ['Palavra-passe inicial', 'O número de telefone indicado na inscrição, sem o prefixo +258'],
  ]);
  letter.paragraph(
    'No primeiro acesso o sistema pede-lhe que defina uma palavra-passe pessoal, que substitui a '
    + 'inicial. Guarde-a em segurança e não a partilhe com ninguém. Depois de várias tentativas '
    + 'falhadas a conta é bloqueada; nesse caso, ou se se esquecer da palavra-passe, contacte a secretaria.',
    { gap: 5 },
  );

  letter.grid('3. O que pode fazer no portal do estudante', portalSections);
  letter.closing('Desejamos-lhe um percurso académico de grande sucesso.');
  letter.save(`carta-boas-vindas-${documents.code}.pdf`);
}
