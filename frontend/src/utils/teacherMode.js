let teacherMode = false;
let portalKind = 'teachers';

/** Indica se a sessão actual é de um portal pessoal (professor ou funcionário «outros»). */
export const setTeacherMode = (value) => {
  teacherMode = Boolean(value);
};

export const isTeacherMode = () => teacherMode;

/** Tipo de funcionário do portal pessoal: «teachers» ou «other». */
export const setPortalKind = (kind) => {
  portalKind = kind === 'other' || kind === 'hr' ? kind : 'teachers';
};

export const getPortalKind = () => portalKind;

let personalScope = false;

/** Pedidos das páginas «Meu Perfil» do RH: o servidor só devolve os dados do próprio. */
export const setPersonalScope = (value) => {
  personalScope = Boolean(value);
};

export const isPersonalScope = () => personalScope;
