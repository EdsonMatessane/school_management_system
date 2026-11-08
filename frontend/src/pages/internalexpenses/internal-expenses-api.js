import { api } from '../../services/api';

const base = '/internal-expenses';

export const getExpenseSettings = () =>
  api.get(`${base}/settings`).then(({ data }) => data);
export const saveExpenseSettings = (settings) =>
  api.put(`${base}/settings`, settings).then(({ data }) => data);

export const getExpenseRequesters = () =>
  api.get(`${base}/requesters`).then(({ data }) => data);

export const getExpenseDashboard = () =>
  api.get(`${base}/dashboard`).then(({ data }) => data);
export const getExpenses = (params = {}) =>
  api.get(`${base}/expenses`, { params }).then(({ data }) => data);
export const getExpense = (id) =>
  api.get(`${base}/expenses/${id}`).then(({ data }) => data);
export const createExpense = (expense) =>
  api.post(`${base}/expenses`, expense).then(({ data }) => data);
export const updateExpense = (id, expense) =>
  api.put(`${base}/expenses/${id}`, expense).then(({ data }) => data);
export const submitExpense = (id, actor) =>
  api.post(`${base}/expenses/${id}/submit`, { actor }).then(({ data }) => data);
export const decideExpense = (id, decision, actor, comment) =>
  api
    .post(`${base}/expenses/${id}/decision/${decision}`, { actor, comment })
    .then(({ data }) => data);
export const cancelExpense = (id, actor, comment) =>
  api.post(`${base}/expenses/${id}/cancel`, { actor, comment }).then(({ data }) => data);
export const getExpensePayments = (id) =>
  api.get(`${base}/expenses/${id}/payments`).then(({ data }) => data);
export const getAllExpensePayments = () =>
  api.get(`${base}/payments`).then(({ data }) => data);
export const createExpensePayment = (id, payment) =>
  api.post(`${base}/expenses/${id}/payments`, payment).then(({ data }) => data);
export const reverseExpensePayment = (id, actor, comment) =>
  api.post(`${base}/payments/${id}/reverse`, { actor, comment }).then(({ data }) => data);
export const getExpenseAudit = (id) =>
  api.get(`${base}/expenses/${id}/audit`).then(({ data }) => data);

export const getExpenseCategories = () =>
  api.get(`${base}/categories`).then(({ data }) => data);
export const saveExpenseCategory = (category, id) =>
  id
    ? api.put(`${base}/categories/${id}`, category).then(({ data }) => data)
    : api.post(`${base}/categories`, category).then(({ data }) => data);
export const setExpenseCategoryActive = (id, active) =>
  api.patch(`${base}/categories/${id}/activation`, { active }).then(({ data }) => data);

export const getExpenseSuppliers = () =>
  api.get(`${base}/suppliers`).then(({ data }) => data);
export const saveExpenseSupplier = (supplier, id) =>
  id
    ? api.put(`${base}/suppliers/${id}`, supplier).then(({ data }) => data)
    : api.post(`${base}/suppliers`, supplier).then(({ data }) => data);
export const setExpenseSupplierActive = (id, active) =>
  api.patch(`${base}/suppliers/${id}/activation`, { active }).then(({ data }) => data);

export const getExpenseBudgets = () =>
  api.get(`${base}/budgets`).then(({ data }) => data);
export const saveExpenseBudget = (budget, id) =>
  id
    ? api.put(`${base}/budgets/${id}`, budget).then(({ data }) => data)
    : api.post(`${base}/budgets`, budget).then(({ data }) => data);
