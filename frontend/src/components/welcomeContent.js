/* Textos da nota de boas-vindas do primeiro acesso, por tipo de utilizador. */
export const welcomeContent = {
  student: {
    title: 'Bem-vindo(a) ao portal do estudante',
    intro: 'Aqui acompanha tudo sobre o seu curso. Para começar, siga estes passos:',
    steps: [
      ['Confirme os seus dados', 'Em Minha informação veja o seu nome, o curso e a data de inscrição. Se algo estiver errado, faça um pedido à secretaria em Pedidos.'],
      ['Conheça o seu curso', 'Em Cursos encontra os módulos, as disciplinas e os professores; em Aulas online, as aulas marcadas e os materiais.'],
      ['Acompanhe os pagamentos', 'Em Pagamentos vê as mensalidades e taxas por pagar, em atraso e pagas, e o histórico.'],
      ['Consulte notas e presenças', 'Notas, Pautas e Presenças mostram o seu aproveitamento e as suas faltas.'],
      ['Faça pedidos', 'Em Pedidos envia pedidos à secretaria (com anexos) e vê o estado de cada um.'],
      ['Cartão e carta', 'O seu cartão de estudante digital e a carta de boas-vindas em PDF estão na secção Cartão e carta.'],
    ],
    tips: ['O sino no topo avisa-o de novas notificações.', 'Pode mudar o tema e a palavra-passe em Minha informação.', 'Termine sempre a sessão em Sair, sobretudo em computadores partilhados.'],
  },
  teacher: {
    title: 'Bem-vindo(a) ao portal do professor',
    intro: 'Este é o seu espaço de trabalho. Sugerimos que comece assim:',
    steps: [
      ['Confirme o seu perfil', 'Em Meu Perfil › Informação veja os seus dados e o seu cartão de funcionário, e altere a palavra-passe.'],
      ['Veja os seus cursos', 'Em Meus Cursos estão os cursos que lhe foram atribuídos.'],
      ['Trabalhe com os estudantes', 'Em Estudantes consulte a lista e gira testes, exames, registo de notas, presenças e pautas.'],
      ['Aulas online', 'Em Aulas Online registe as aulas, com a ligação e os materiais.'],
      ['Presenças e saídas', 'Em Meu Perfil consulte as suas presenças e peça saídas em Pedidos de Saída.'],
      ['Finanças, tarefas e avisos', 'Em Finanças veja os seus salários; em Tarefas, o que lhe foi atribuído; em Notificações, os avisos.'],
    ],
    tips: ['Os documentos a expirar aparecem em Meu Perfil › Documentos.', 'Termine sempre a sessão quando sair.'],
  },
  other: {
    title: 'Bem-vindo(a) ao portal do funcionário',
    intro: 'Este é o seu espaço de trabalho. Sugerimos que comece assim:',
    steps: [
      ['Confirme o seu perfil', 'Em Meu Perfil › Informação veja os seus dados e o seu cartão de funcionário, e altere a palavra-passe.'],
      ['Presenças e saídas', 'Em Meu Perfil consulte as suas presenças e peça saídas em Pedidos de Saída.'],
      ['Finanças', 'Em Finanças consulte os seus salários.'],
      ['Tarefas', 'Em Tarefas veja o que lhe foi atribuído, incluindo as tarefas encaminhadas (Encaminhadas).'],
      ['Notificações', 'Em Notificações leia os avisos da instituição.'],
    ],
    tips: ['Termine sempre a sessão quando sair.'],
  },
  hr: {
    title: 'Bem-vindo(a) ao sistema (Recursos Humanos)',
    intro: 'Tem o Meu Perfil pessoal e o acesso à gestão da escola. Sugerimos que comece assim:',
    steps: [
      ['Confirme o seu perfil', 'Em Meu Perfil › Informação veja os seus dados e o seu cartão de funcionário, e altere a palavra-passe.'],
      ['Gestão do pessoal', 'Em Funcionários registe e gira professores, RH e outros funcionários, e os seus documentos.'],
      ['Presenças e saídas', 'Registe as presenças do pessoal e trate os pedidos de saída.'],
      ['Restantes áreas', 'Use o menu lateral para as outras áreas a que tem acesso; algumas estão só em modo de consulta.'],
    ],
    tips: ['A Pesquisa permite consultar um estudante pelo código.', 'Termine sempre a sessão quando sair.'],
  },
  admin: {
    title: 'Bem-vindo(a) ao Cacoin',
    intro: 'Como administrador, sugerimos esta ordem para preparar a escola:',
    steps: [
      ['Dados da escola', 'Em Configurações › Escola preencha o nome, a morada, os contactos e o logótipo; em Relatórios defina o cabeçalho e o rodapé dos PDFs.'],
      ['Cursos e taxas', 'Em Gestão de Cursos crie cursos, categorias, níveis, modalidades e as taxas (mensalidades, inscrição, manual).'],
      ['Funcionários', 'Em Funcionários registe professores, RH e outros funcionários.'],
      ['Estudantes', 'Em Estudantes › Inscrever inscreva os estudantes. As contas criam-se sozinhas: utilizador é o código e a palavra-passe inicial é o telefone, sem +258.'],
      ['Utilizadores', 'Em Usuários gira os acessos, os bloqueios e as regras de palavra-passe.'],
      ['No dia-a-dia', 'Use Pesquisa para consultar um estudante e o Dashboard para acompanhar a escola.'],
    ],
    tips: ['Altere o código de administrador temporário o quanto antes e guarde a palavra-passe em segurança.'],
  },
};
