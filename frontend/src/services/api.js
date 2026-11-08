import { isPersonalScope } from '../utils/teacherMode';
import { getApiBase, isPartitionBase, schoolProfileKey } from '../utils/institution';
import axios from 'axios';

export const api = axios.create({
  baseURL: getApiBase(),
});

const TOKEN_KEY = 'cacoin.token';

export const getAuthToken = () => {
  try {
    return window.localStorage.getItem(TOKEN_KEY) || window.sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const getAuthTokenKind = () => {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const encoded = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
    return window.atob(encoded).split('.')[1] ?? null;
  } catch {
    return null;
  }
};

export const setAuthToken = (token, remember = true) => {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(TOKEN_KEY);
    if (token) (remember ? window.localStorage : window.sessionStorage).setItem(TOKEN_KEY, token);
  } catch {
    return;
  }
};

const withToken = (url) => {
  const token = getAuthToken();
  return token ? `${url}${url.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}` : url;
};

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (isPersonalScope()) config.headers['X-Personal-Scope'] = '1';
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.startsWith('/auth/')) {
      setAuthToken(null);
      window.location.reload();
    }
    return Promise.reject(error);
  },
);

export const getFolders = () => api.get('/folders').then((response) => response.data);
export const createFolder = (folder) =>
  api.post('/folders', folder).then((response) => response.data);
export const renameFolder = (id, name) =>
  api.patch(`/folders/${id}`, { name }).then((response) => response.data);
export const moveFolder = (id, parentId) =>
  api.patch(`/folders/${id}/parent`, { parentId }).then((response) => response.data);
export const deleteFolder = (id, cascade = false) =>
  api.delete(`/folders/${id}`, { params: { cascade } });
export const downloadFolderZip = (id) =>
  api.get(`/folders/${id}/zip`, { responseType: 'blob' }).then((response) => response.data);
export const getFolderFiles = (id) =>
  api.get(`/folders/${id}/files`).then((response) => response.data);
export const uploadFolderFiles = (id, files) => {
  const body = new FormData();
  Array.from(files).forEach((file) => body.append('files', file));
  return api.post(`/folders/${id}/files`, body).then((response) => response.data);
};
export const deleteFolderFile = (id, fileId) => api.delete(`/folders/${id}/files/${fileId}`);
export const getFolderFileUrl = (id, fileId, download = false) =>
  withToken(api.getUri({ url: `/folders/${id}/files/${fileId}`, params: download ? { download: true } : undefined }));

export const getTasks = () => api.get('/tasks').then((response) => response.data);
export const getTaskPeople = () => api.get('/tasks/people').then((response) => response.data);
export const getTaskNotifications = () => api.get('/tasks/notifications').then((response) => response.data);
export const getTaskMe = () => api.get('/tasks/me').then((response) => response.data);
export const createTask = (task) => api.post('/tasks', task).then((response) => response.data);
export const updateTask = (id, task) => api.put(`/tasks/${id}`, task).then((response) => response.data);
export const setTaskStatus = (id, status) =>
  api.patch(`/tasks/${id}/status`, { status }).then((response) => response.data);
export const setTaskArchived = (id, archived) =>
  api.patch(`/tasks/${id}/archive`, { archived }).then((response) => response.data);
export const deleteTask = (id) => api.delete(`/tasks/${id}`);
export const addTaskComment = (id, comment) =>
  api.post(`/tasks/${id}/comments`, comment).then((response) => response.data);
export const deleteTaskComment = (id, commentId) =>
  api.delete(`/tasks/${id}/comments/${commentId}`).then((response) => response.data);

export const getLevels = () => api.get('/courses/levels').then((response) => response.data);
export const createLevel = (level) =>
  api.post('/courses/levels', level).then((response) => response.data);
export const updateLevel = (id, level) =>
  api.put(`/courses/levels/${id}`, level).then((response) => response.data);
export const setLevelActive = (id, active) =>
  api.patch(`/courses/levels/${id}/activation`, { active }).then((response) => response.data);
export const deleteLevel = (id) => api.delete(`/courses/levels/${id}`);

export const getCategories = () =>
  api.get('/courses/categories').then((response) => response.data);
export const createCategory = (category) =>
  api.post('/courses/categories', category).then((response) => response.data);
export const updateCategory = (id, category) =>
  api.put(`/courses/categories/${id}`, category).then((response) => response.data);
export const setCategoryActive = (id, active) =>
  api.patch(`/courses/categories/${id}/activation`, { active }).then((response) => response.data);
export const deleteCategory = (id) => api.delete(`/courses/categories/${id}`);

export const getModalities = () =>
  api.get('/courses/modalities').then((response) => response.data);
export const createModality = (modality) =>
  api.post('/courses/modalities', modality).then((response) => response.data);
export const updateModality = (id, modality) =>
  api.put(`/courses/modalities/${id}`, modality).then((response) => response.data);
export const setModalityActive = (id, active) =>
  api.patch(`/courses/modalities/${id}/activation`, { active }).then((response) => response.data);
export const deleteModality = (id) => api.delete(`/courses/modalities/${id}`);

export const getMonthlyFees = () =>
  api.get('/courses/monthlyfees').then((response) => response.data);
export const createMonthlyFee = (monthlyFee) =>
  api.post('/courses/monthlyfees', monthlyFee).then((response) => response.data);
export const updateMonthlyFee = (id, monthlyFee) =>
  api.put(`/courses/monthlyfees/${id}`, monthlyFee).then((response) => response.data);
export const setMonthlyFeeActive = (id, active) =>
  api.patch(`/courses/monthlyfees/${id}/activation`, { active }).then((response) => response.data);
export const deleteMonthlyFee = (id) => api.delete(`/courses/monthlyfees/${id}`);

export const getEnrollmentFees = () =>
  api.get('/courses/enrollmentfees').then((response) => response.data);
export const createEnrollmentFee = (enrollmentFee) =>
  api.post('/courses/enrollmentfees', enrollmentFee).then((response) => response.data);
export const updateEnrollmentFee = (id, enrollmentFee) =>
  api.put(`/courses/enrollmentfees/${id}`, enrollmentFee).then((response) => response.data);
export const setEnrollmentFeeActive = (id, active) =>
  api.patch(`/courses/enrollmentfees/${id}/activation`, { active }).then((response) => response.data);
export const deleteEnrollmentFee = (id) => api.delete(`/courses/enrollmentfees/${id}`);

export const getManualFees = () =>
  api.get('/courses/manualfees').then((response) => response.data);
export const createManualFee = (manualFee) =>
  api.post('/courses/manualfees', manualFee).then((response) => response.data);
export const updateManualFee = (id, manualFee) =>
  api.put(`/courses/manualfees/${id}`, manualFee).then((response) => response.data);
export const setManualFeeActive = (id, active) =>
  api.patch(`/courses/manualfees/${id}/activation`, { active }).then((response) => response.data);
export const deleteManualFee = (id) => api.delete(`/courses/manualfees/${id}`);

export const getCourses = () => api.get('/courses').then((response) => response.data);
export const getOnlineClassPlatforms = () =>
  api.get('/online-classes/settings/platforms').then((response) => response.data);
export const updateOnlineClassPlatforms = (platforms) =>
  api.put('/online-classes/settings/platforms', platforms).then((response) => {
    window.dispatchEvent(new Event('online-class-platforms-updated'));
    return response.data;
  });
export const getOnlineAttendanceSettings = () =>
  api.get('/online-classes/settings/attendance').then((response) => response.data);
export const updateOnlineAttendanceSettings = (settings) =>
  api.put('/online-classes/settings/attendance', settings).then((response) => response.data);
export const getMozambiqueLocations = () =>
  api.get('/locations/mozambique').then((response) => response.data);
export const createCourse = (course) =>
  api.post('/courses', course).then((response) => response.data);
export const updateCourse = (id, course) =>
  api.put(`/courses/${id}`, course).then((response) => response.data);
export const setCourseActive = (id, active) =>
  api.patch(`/courses/${id}/activation`, { active }).then((response) => response.data);
export const deleteCourse = (id) => api.delete(`/courses/${id}`);

export const getModules = () => api.get('/modules').then((response) => response.data);
export const getModule = (id) => api.get(`/modules/${id}`).then((response) => response.data);
export const createModule = (module) =>
  api.post('/modules', module).then((response) => response.data);
export const updateModule = (id, module) =>
  api.put(`/modules/${id}`, module).then((response) => response.data);
export const setModuleActive = (id, active) =>
  api.patch(`/modules/${id}/activation`, { active }).then((response) => response.data);
export const deleteModule = (id) => api.delete(`/modules/${id}`);

export const getDisciplines = () => api.get('/disciplines').then((response) => response.data);
export const getCourseDisciplines = (courseId) =>
  api.get(`/disciplines/course/${courseId}`).then((response) => response.data);
export const createDiscipline = (discipline) =>
  api.post('/disciplines', discipline).then((response) => response.data);
export const updateDiscipline = (id, discipline) =>
  api.put(`/disciplines/${id}`, discipline).then((response) => response.data);
export const setDisciplineActive = (id, active) =>
  api.patch(`/disciplines/${id}/activation`, { active }).then((response) => response.data);
export const deleteDiscipline = (id) => api.delete(`/disciplines/${id}`);

export const createStudentEnrollment = (enrollment) =>
  api.post('/students/enrollments', enrollment).then((response) => response.data);
export const getPaymentMethods = () =>
  api.get('/payments/methods').then((response) => response.data);
export const createPaymentMethod = (method) =>
  api.post('/payments/methods', method).then((response) => response.data);
export const updatePaymentMethod = (id, method) =>
  api.put(`/payments/methods/${id}`, method).then((response) => response.data);
export const setPaymentMethodActive = (id, active) =>
  api.patch(`/payments/methods/${id}/activation`, { active }).then((response) => response.data);
export const deletePaymentMethod = (id) => api.delete(`/payments/methods/${id}`);
export const getPaymentPeriod = () => api.get('/payments/period').then((response) => response.data);
export const updatePaymentPeriod = (period) =>
  api.put('/payments/period', period).then((response) => response.data);
export const previewPaymentPeriod = (period, months = 6) =>
  api.post('/payments/period/preview', period, { params: { months } })
    .then((response) => response.data);
export const applyPaymentPeriod = () =>
  api.post('/payments/period/apply').then((response) => response.data);
export const getStudents = () => api.get('/students').then((response) => response.data);
export const updateStudent = (id, student) =>
  api.put(`/students/${id}`, student).then((response) => response.data);
export const setStudentActive = (id, active) =>
  api.patch(`/students/${id}/activation`, { active });
export const deleteStudent = (id) => api.delete(`/students/${id}`);
export const getStudentTests = () => api.get('/students/tests').then((response) => response.data);
export const getTestRegistrations = (testType) =>
  api.get('/tests/registrations', { params: testType ? { testType } : {} })
    .then((response) => response.data);
export const createTestRegistration = (registration) =>
  api.post('/tests/registrations', registration).then((response) => response.data);
export const recordTestRegistrationPayment = (id, payment) =>
  api.post(`/tests/registrations/${id}/payments`, payment).then((response) => response.data);
export const getTestSettings = () => api.get('/settings/tests').then((response) => response.data);
export const updateTestSettings = (settings) =>
  api.put('/settings/tests', settings).then((response) => response.data);
export const updateTestFee = (testType, amount, charge = true) =>
  api.patch(`/settings/tests/fees/${testType}`, { amount, charge }).then((response) => response.data);
export const deleteTestFee = (testType) =>
  api.delete(`/settings/tests/fees/${testType}`).then((response) => response.data);
export const setTestFeeActive = (testType, active) =>
  api.patch(`/settings/tests/fees/${testType}/activation`, { active })
    .then((response) => response.data);
export const getExamRegistrations = (examType) =>
  api.get('/exams/registrations', { params: examType ? { examType } : {} })
    .then((response) => response.data);
export const createExamRegistration = (registration) =>
  api.post('/exams/registrations', registration).then((response) => response.data);
export const recordExamRegistrationPayment = (id, payment) =>
  api.post(`/exams/registrations/${id}/payments`, payment).then((response) => response.data);
export const getUniformSettings = () =>
  api.get('/settings/uniforms').then((response) => response.data);
export const updateUniformFee = (amount) =>
  api.patch('/settings/uniforms/fee', { amount }).then((response) => response.data);
export const deleteUniformFee = () =>
  api.delete('/settings/uniforms/fee').then((response) => response.data);
export const setUniformFeeActive = (active) =>
  api.patch('/settings/uniforms/fee/activation', { active }).then((response) => response.data);
export const getUniformStock = () =>
  api.get('/uniforms/stock').then((response) => response.data);
export const createUniformStockEntry = (entry) =>
  api.post('/uniforms/stock/entries', entry).then((response) => response.data);
export const getUniformOrders = () =>
  api.get('/uniforms/orders').then((response) => response.data);
export const createUniformOrder = (order) =>
  api.post('/uniforms/orders', order).then((response) => response.data);
export const payUniformOrder = (id, payment) =>
  api.post(`/uniforms/orders/${id}/payment`, payment).then((response) => response.data);
export const deliverUniformOrder = (id) =>
  api.post(`/uniforms/orders/${id}/delivery`).then((response) => response.data);
export const getGraduationSettings = () =>
  api.get('/settings/graduations').then((response) => response.data);
export const updateGraduationSettings = (settings) =>
  api.put('/settings/graduations', settings).then((response) => response.data);
export const updateGraduationFee = (key, amount) =>
  api.patch(`/settings/graduations/fees/${key}`, { amount }).then((response) => response.data);
export const deleteGraduationFee = (key) =>
  api.delete(`/settings/graduations/fees/${key}`).then((response) => response.data);
export const setGraduationFeeActive = (key, active) =>
  api.patch(`/settings/graduations/fees/${key}/activation`, { active })
    .then((response) => response.data);
export const updateGraduationGuests = (includedGuests) =>
  api.patch('/settings/graduations/guests', { includedGuests }).then((response) => response.data);
export const updateGraduationPeriod = (period) =>
  api.put('/settings/graduations/period', period).then((response) => response.data);
export const updateGraduationDay = (day) =>
  api.put('/settings/graduations/day', day).then((response) => response.data);
export const createGraduationRequirement = (requirement) =>
  api.post('/settings/graduations/requirements', requirement).then((response) => response.data);
export const updateGraduationRequirement = (id, requirement) =>
  api.put(`/settings/graduations/requirements/${id}`, requirement)
    .then((response) => response.data);
export const deleteGraduationRequirement = (id) =>
  api.delete(`/settings/graduations/requirements/${id}`).then((response) => response.data);
export const getGraduationRegistrations = () =>
  api.get('/graduations/registrations').then((response) => response.data);
export const createGraduationRegistration = (registration) =>
  api.post('/graduations/registrations', registration).then((response) => response.data);
export const payGraduationRegistration = (id, payment) =>
  api.post(`/graduations/registrations/${id}/payment`, payment).then((response) => response.data);
export const graduateRegistration = (id) =>
  api.post(`/graduations/registrations/${id}/graduation`).then((response) => response.data);
export const getGraduates = () =>
  api.get('/graduations/graduates').then((response) => response.data);
export const createGraduate = (graduate) =>
  api.post('/graduations/graduates', graduate).then((response) => response.data);
export const getSuspensionSettings = () =>
  api.get('/settings/suspensions').then((response) => response.data);
export const updateSuspensionFee = (amount) =>
  api.patch('/settings/suspensions/fee', { amount }).then((response) => response.data);
export const deleteSuspensionFee = () =>
  api.delete('/settings/suspensions/fee').then((response) => response.data);
export const setSuspensionFeeActive = (active) =>
  api.patch('/settings/suspensions/fee/activation', { active }).then((response) => response.data);
export const getSuspensionRegistrations = () =>
  api.get('/suspensions/registrations').then((response) => response.data);
export const createSuspensionRegistration = (registration) =>
  api.post('/suspensions/registrations', registration).then((response) => response.data);
export const paySuspensionRegistration = (id, payment) =>
  api.post(`/suspensions/registrations/${id}/payment`, payment).then((response) => response.data);
export const suspendRegistration = (id) =>
  api.post(`/suspensions/registrations/${id}/suspension`).then((response) => response.data);
export const getAttendanceRecords = () =>
  api.get('/attendances/records').then((response) => response.data);
export const createAttendanceRecord = (record) =>
  api.post('/attendances/records', record).then((response) => response.data);
export const updateAttendanceStatus = (id, status) =>
  api.patch(`/attendances/records/${id}/status`, { status }).then((response) => response.data);
export const deleteAttendanceRecord = (id) =>
  api.delete(`/attendances/records/${id}`).then((response) => response.data);
export const requestAttendanceJustification = (id) =>
  api.post(`/attendances/records/${id}/justification`).then((response) => response.data);
export const payAttendanceJustification = (id, payment) =>
  api.post(`/attendances/records/${id}/justification/payment`, payment)
    .then((response) => response.data);
export const getAttendanceExcesses = () =>
  api.get('/attendances/excesses').then((response) => response.data);
export const getAttendanceTeachers = (courseId) =>
  api.get('/attendances/teachers', { params: { courseId } }).then((response) => response.data);
export const getAssessmentSheets = (params) =>
  api.get('/assessments/sheets', { params }).then((response) => response.data);
export const createAssessmentSheet = (sheet) =>
  api.post('/assessments/sheets', sheet).then((response) => response.data);
export const getAssessmentTeachers = (courseId) =>
  api.get('/assessments/teachers', { params: { courseId } }).then((response) => response.data);
export const getAssessmentEntries = (sheetId, component) =>
  api.get(`/assessments/sheets/${sheetId}/components/${component}/grades`)
    .then((response) => response.data);
export const saveAssessmentGrades = (sheetId, component, grades) =>
  api.put(`/assessments/sheets/${sheetId}/components/${component}/grades`, grades)
    .then((response) => response.data);
export const getAssessmentGrades = (courseId, year, sheetId, completed) =>
  api.get('/assessments/grades', { params: { courseId, year, sheetId, completed } })
    .then((response) => response.data);
export const completeAssessmentRecord = (sheetId, studentId) =>
  api.post(`/assessments/sheets/${sheetId}/students/${studentId}/complete`);
export const deleteAssessmentRecord = (sheetId, studentId) =>
  api.delete(`/assessments/sheets/${sheetId}/students/${studentId}`);
export const getPautaSettings = () =>
  api.get('/settings/pautas').then((response) => response.data);
export const updatePautaPeriod = (period) =>
  api.put('/settings/pautas/period', period).then((response) => response.data);
export const getPautas = (params) =>
  api.get('/pautas', { params }).then((response) => response.data);
export const getPautaYears = () =>
  api.get('/pautas/years').then((response) => response.data);
export const getPautaPreview = (studentId, year) =>
  api.get('/pautas/preview', { params: { studentId, year } }).then((response) => response.data);
export const createPauta = (pauta) =>
  api.post('/pautas', pauta).then((response) => response.data);
export const refreshPauta = (id) =>
  api.post(`/pautas/${id}/refresh`).then((response) => response.data);
export const deletePauta = (id) =>
  api.delete(`/pautas/${id}`).then((response) => response.data);
export const getStaffDocumentTypes = () =>
  api.get('/staff-documents/types').then((response) => response.data);
export const createStaffDocumentType = (type) =>
  api.post('/staff-documents/types', type).then((response) => response.data);
export const updateStaffDocumentType = (id, type) =>
  api.put(`/staff-documents/types/${id}`, type).then((response) => response.data);
export const deleteStaffDocumentType = (id) =>
  api.delete(`/staff-documents/types/${id}`).then((response) => response.data);
export const getStaffDocuments = (staffId) =>
  api.get(`/staff-documents/staff/${staffId}`).then((response) => response.data);
export const createStaffDocument = (staffId, document) =>
  api.post(`/staff-documents/staff/${staffId}`, document).then((response) => response.data);
export const deleteStaffDocument = (id) =>
  api.delete(`/staff-documents/${id}`).then((response) => response.data);
export const renewStaffDocument = (id, dates) =>
  api.put(`/staff-documents/${id}/renewal`, dates).then((response) => response.data);
export const getExpiringStaffDocuments = (days) =>
  api.get('/staff-documents/expiring', { params: { days } }).then((response) => response.data);
export const getExpiredStaffDocuments = () =>
  api.get('/staff-documents/expired').then((response) => response.data);
export const getFinanceDashboard = () =>
  api.get('/finance/dashboard').then((response) => response.data);
export const getFinanceEmployees = () =>
  api.get('/finance/employees').then((response) => response.data);
export const getFinanceSettings = () =>
  api.get('/finance/settings').then((response) => response.data);
export const updateFinancePeriod = (period) =>
  api.put('/finance/settings/period', period).then((response) => response.data);
export const updateFinanceRules = (rules) =>
  api.put('/finance/settings/rules', rules).then((response) => response.data);
export const getFinancePositions = () =>
  api.get('/finance/positions').then((response) => response.data);
export const createFinancePosition = (item) =>
  api.post('/finance/positions', item).then((response) => response.data);
export const updateFinancePosition = (id, item) =>
  api.put(`/finance/positions/${id}`, item).then((response) => response.data);
export const deleteFinancePosition = (id) =>
  api.delete(`/finance/positions/${id}`).then((response) => response.data);
export const getFinanceSalaryTypes = () =>
  api.get('/finance/salary-types').then((response) => response.data);
export const createFinanceSalaryType = (item) =>
  api.post('/finance/salary-types', item).then((response) => response.data);
export const updateFinanceSalaryType = (id, item) =>
  api.put(`/finance/salary-types/${id}`, item).then((response) => response.data);
export const deleteFinanceSalaryType = (id) =>
  api.delete(`/finance/salary-types/${id}`).then((response) => response.data);
export const getFinanceBonusTypes = () =>
  api.get('/finance/bonus-types').then((response) => response.data);
export const createFinanceBonusType = (item) =>
  api.post('/finance/bonus-types', item).then((response) => response.data);
export const updateFinanceBonusType = (id, item) =>
  api.put(`/finance/bonus-types/${id}`, item).then((response) => response.data);
export const deleteFinanceBonusType = (id) =>
  api.delete(`/finance/bonus-types/${id}`).then((response) => response.data);
export const getSalaryRegistrations = () =>
  api.get('/finance/registrations').then((response) => response.data);
export const createSalaryRegistration = (registration) =>
  api.post('/finance/registrations', registration).then((response) => response.data);
export const updateSalaryRegistration = (id, registration) =>
  api.put(`/finance/registrations/${id}`, registration).then((response) => response.data);
export const deleteSalaryRegistration = (id) =>
  api.delete(`/finance/registrations/${id}`).then((response) => response.data);
export const getSalaryPayments = (kind) =>
  api.get('/finance/payments', { params: kind ? { kind } : {} }).then((response) => response.data);
export const processSalary = (payment) =>
  api.post('/finance/payments/processing', payment).then((response) => response.data);
export const advanceSalary = (payment) =>
  api.post('/finance/payments/advance', payment).then((response) => response.data);
export const liquidateSalary = (payment) =>
  api.post('/finance/payments/liquidation', payment).then((response) => response.data);
export const getSalaryPending = () =>
  api.get('/finance/pending').then((response) => response.data);
export const getSalaryDebts = () =>
  api.get('/finance/debts').then((response) => response.data);
export const getFinanceReport = (params) =>
  api.get('/finance/reports', { params }).then((response) => response.data);
export const getExamSettings = () => api.get('/settings/exams').then((response) => response.data);
export const updateExamSettings = (settings) =>
  api.put('/settings/exams', settings).then((response) => response.data);
export const updateExamFee = (examType, amount, charge = true) =>
  api.patch(`/settings/exams/fees/${examType}`, { amount, charge }).then((response) => response.data);
export const deleteExamFee = (examType) =>
  api.delete(`/settings/exams/fees/${examType}`).then((response) => response.data);
export const setExamFeeActive = (examType, active) =>
  api.patch(`/settings/exams/fees/${examType}/activation`, { active })
    .then((response) => response.data);
export const createStudentTest = (test) =>
  api.post('/students/tests', test).then((response) => response.data);
export const updateStudentTest = (id, test) =>
  api.put(`/students/tests/${id}`, test).then((response) => response.data);
export const setStudentTestCompleted = (id, completed) =>
  api.patch(`/students/tests/${id}/status`, { completed }).then((response) => response.data);
export const deleteStudentTest = (id) => api.delete(`/students/tests/${id}`);
export const getStudentTestGrades = (id) =>
  api.get(`/students/tests/${id}/grades`).then((response) => response.data);
export const createStudentTestGrade = (id, grade) =>
  api.post(`/students/tests/${id}/grades`, grade).then((response) => response.data);
export const updateStudentTestGrade = (id, gradeId, grade) =>
  api.put(`/students/tests/${id}/grades/${gradeId}`, grade).then((response) => response.data);
export const deleteStudentTestGrade = (id, gradeId) =>
  api.delete(`/students/tests/${id}/grades/${gradeId}`);
export const getStudentExams = () => api.get('/students/exams').then((response) => response.data);
export const createStudentExam = (exam) =>
  api.post('/students/exams', exam).then((response) => response.data);
export const updateStudentExam = (id, exam) =>
  api.put(`/students/exams/${id}`, exam).then((response) => response.data);
export const setStudentExamCompleted = (id, completed) =>
  api.patch(`/students/exams/${id}/status`, { completed }).then((response) => response.data);
export const deleteStudentExam = (id) => api.delete(`/students/exams/${id}`);
export const getStudentExamGrades = (id) =>
  api.get(`/students/exams/${id}/grades`).then((response) => response.data);
export const createStudentExamGrade = (id, grade) =>
  api.post(`/students/exams/${id}/grades`, grade).then((response) => response.data);
export const updateStudentExamGrade = (id, gradeId, grade) =>
  api.put(`/students/exams/${id}/grades/${gradeId}`, grade).then((response) => response.data);
export const deleteStudentExamGrade = (id, gradeId) =>
  api.delete(`/students/exams/${id}/grades/${gradeId}`);
export const getStudentFeeCharges = (feeType) =>
  api.get('/students/charges', { params: { feeType } }).then((response) => response.data);
export const getStudentEnrollmentPayments = (status) =>
  api.get('/students/enrollment-payments', { params: status ? { status } : {} })
    .then((response) => response.data);
export const createStudentFeeCharge = (studentId, charge) =>
  api.post(`/students/${studentId}/charges`, charge).then((response) => response.data);
export const recordStudentFeePayment = (chargeId, payment) =>
  api.post(`/students/charges/${chargeId}/payments`, payment).then((response) => response.data);
export const recordStudentFeeBatchPayment = (payment) =>
  api.post('/students/charges/payments/batch', payment).then((response) => response.data);

export const getStaff = (type) =>
  api.get(`/staff/${type}`).then((response) => response.data);
export const getStaffCourses = (type, id) =>
  api.get(`/staff/${type}/${id}/courses`).then((response) => response.data);
export const addStaffCourse = (type, id, courseId) =>
  api.post(`/staff/${type}/${id}/courses`, { courseId }).then((response) => response.data);
export const setStaffCourseActive = (type, id, assignmentId, active) =>
  api.patch(`/staff/${type}/${id}/courses/${assignmentId}/activation`, { active })
    .then((response) => response.data);
export const removeStaffCourse = (type, id, assignmentId) =>
  api.delete(`/staff/${type}/${id}/courses/${assignmentId}`);
export const createStaff = (type, formData) =>
  api.post(`/staff/${type}/enrollments`, formData).then((response) => response.data);
export const updateStaff = (type, id, formData) =>
  api.put(`/staff/${type}/${id}`, formData).then((response) => response.data);
export const setStaffActive = (type, id, active) =>
  api.patch(`/staff/${type}/${id}/activation`, { active });
export const deleteStaff = (type, id) => api.delete(`/staff/${type}/${id}`);
export const getStaffDocumentUrl = (type, id, kind) =>
  withToken(api.getUri({ url: `/staff/${type}/${id}/documents/${kind}` }));

export const getSystemSettings = () => api.get('/settings').then((response) => response.data);
export const updateSystemSettings = (settings) => api.put('/settings', settings).then((response) => response.data);
export const getStudentFormSettings = () =>
  api.get('/settings').then((response) => response.data.requiredStudentFields ?? []);
export const getHolidays = () => api.get('/settings/holidays').then((response) => response.data);
export const createHoliday = (holiday) => api.post('/settings/holidays', holiday).then((response) => response.data);
export const updateHoliday = (id, holiday) => api.put(`/settings/holidays/${id}`, holiday).then((response) => response.data);
export const deleteHoliday = (id) => api.delete(`/settings/holidays/${id}`);
export const getSchoolProfile = () => {
  const savedProfile = window.localStorage.getItem(schoolProfileKey());
  if (!savedProfile) return {};

  const profile = JSON.parse(savedProfile);
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    throw new Error('Os dados locais da escola estão num formato inválido.');
  }
  return profile;
};
export const getInstitutionWebsite = () =>
  api.get('/auth/site').then((response) => response.data?.website ?? '');
export const saveInstitutionWebsite = (website) =>
  api.put('/settings/website', { website }).then((response) => response.data?.website ?? '');
export const updateSchoolProfile = async (profile) => {
  let saved = profile;
  if (!isPartitionBase()) {
    // O website guarda-se no servidor: a página inicial mostra-se antes do login.
    saved = {
      ...profile,
      institutionWebsite: await saveInstitutionWebsite(profile.institutionWebsite ?? ''),
    };
  }
  window.localStorage.setItem(schoolProfileKey(), JSON.stringify(saved));
  return saved;
};

export const getSystemStatuses = (modules) =>
  api
    .get('/settings/statuses', { params: modules?.length ? { modules: modules.join(',') } : {} })
    .then((response) => response.data);
export const createSystemStatus = (status) =>
  api.post('/settings/statuses', status).then((response) => response.data);
export const updateSystemStatus = (id, status) =>
  api.put(`/settings/statuses/${id}`, status).then((response) => response.data);
export const setSystemStatusActive = (id, active) =>
  api.patch(`/settings/statuses/${id}/activation`, { active }).then((response) => response.data);
export const deleteSystemStatus = (id) => api.delete(`/settings/statuses/${id}`);

export const getInstitutions = () =>
  api.get('/auth/institutions').then((response) => response.data);
export const activatePartition = (id) =>
  api.post(`/settings/partitions/${id}/activate`).then((response) => response.data);
export const deactivatePartition = (id) =>
  api.post(`/settings/partitions/${id}/deactivate`).then((response) => response.data);
export const getPartitions = () =>
  api.get('/settings/partitions').then((response) => response.data);
export const createPartition = (partition) =>
  api.post('/settings/partitions', partition).then((response) => response.data);
export const createPartitionAdmin = (id, admin) =>
  api.post(`/settings/partitions/${id}/admin`, admin).then((response) => response.data);
export const resetPartitionAdmin = (id, password) =>
  api.post(`/settings/partitions/${id}/admin/reset`, { password }).then((response) => response.data);
export const getPartitionMigrationScopes = () =>
  api.get('/settings/partitions/migration-scopes').then((response) => response.data);
export const migratePartitionData = (id, scope) =>
  api.post(`/settings/partitions/${id}/migrate/${scope}`).then((response) => response.data);
export const getInstanceInfo = () =>
  api.get('/auth/instance').then((response) => response.data);
export const getFineSettings = () =>
  api.get('/settings/fines').then((response) => response.data);
export const updateFineSettings = (percent) =>
  api.put('/settings/fines', { percent }).then((response) => response.data);
export const deleteFineSettings = () =>
  api.delete('/settings/fines').then((response) => response.data);
export const getLeaveSettings = () =>
  api.get('/settings/leaves').then((response) => response.data);
export const updateLeaveSettings = (maxRequestsPerMonth) =>
  api.put('/settings/leaves', { maxRequestsPerMonth }).then((response) => response.data);
export const deleteLeaveSettings = () =>
  api.delete('/settings/leaves').then((response) => response.data);
export const getLeaveRequests = () =>
  api.get('/leaves/requests').then((response) => response.data);
export const createLeaveRequest = (request) =>
  api.post('/leaves/requests', request).then((response) => response.data);
export const setLeaveRequestStatus = (id, status) =>
  api.patch(`/leaves/requests/${id}/status`, { status }).then((response) => response.data);

export const getStudentRequestTypes = () =>
  api.get('/settings/requests/types').then((response) => response.data);
export const createStudentRequestType = (item) =>
  api.post('/settings/requests/types', item).then((response) => response.data);
export const updateStudentRequestType = (id, item) =>
  api.put(`/settings/requests/types/${id}`, item).then((response) => response.data);
export const deleteStudentRequestType = (id) =>
  api.delete(`/settings/requests/types/${id}`).then((response) => response.data);
export const getStudentRequestSettings = () =>
  api.get('/settings/requests/notifications').then((response) => response.data);
export const updateStudentRequestSettings = (settings) =>
  api.put('/settings/requests/notifications', settings).then((response) => response.data);
export const getStudentRequests = () =>
  api.get('/requests').then((response) => response.data);
export const createStudentRequest = (formData) =>
  api.post('/requests', formData).then((response) => response.data);
export const approveStudentRequest = (id) =>
  api.post(`/requests/${id}/approval`).then((response) => response.data);
export const rejectStudentRequest = (id, notes) =>
  api.post(`/requests/${id}/rejection`, { notes }).then((response) => response.data);
export const completeStudentRequest = (id) =>
  api.post(`/requests/${id}/completion`).then((response) => response.data);
export const getStudentRequestAttachmentUrl = (id) =>
  withToken(api.getUri({ url: `/requests/attachments/${id}` }));

export const getAuthStatus = () => api.get('/auth/status').then((response) => response.data);
export const login = (credentials) =>
  api.post('/auth/login', credentials).then((response) => response.data);
export const changeOwnPassword = (payload) =>
  api.post('/auth/password', payload).then((response) => response.data);
export const getUserAccounts = (kind) =>
  api.get('/users/accounts', { params: { kind } }).then((response) => response.data);
export const createAdminAccount = (admin) =>
  api.post('/users/admins', admin).then((response) => response.data);
export const updateAdminAccount = (id, admin) =>
  api.put(`/users/admins/${id}`, admin).then((response) => response.data);
export const applyUserAccountAction = (id, action) =>
  api.post(`/users/accounts/${id}/${action}`).then((response) => response.data);
export const getAuditUsers = () => api.get('/audit/users').then((response) => response.data);
export const getAuditLogs = (accountId) =>
  api.get('/audit/logs', { params: accountId ? { accountId } : {} }).then((response) => response.data);
export const getAuditRecord = (entity, id) =>
  api.get(`/audit/records/${entity}/${id}`).then((response) => response.data);
export const getDashboard = () => api.get('/dashboard').then((response) => response.data);
export const getMobileMoneyWalletSettings = () =>
  api.get('/settings/mobile-money').then((response) => response.data);
export const updateMobileMoneyWalletSettings = (wallets) =>
  api.put('/settings/mobile-money', wallets).then((response) => response.data);
export const getTeacherProfile = () => api.get('/teacher/me').then((response) => response.data);
export const getTeacherNotifications = () =>
  api.get('/teacher/notifications').then((response) => response.data);
export const getPortalOverview = () => api.get('/portal/overview').then((response) => response.data);
export const getPortalPayments = () => api.get('/portal/payments').then((response) => response.data);
export const getPortalAcademics = () => api.get('/portal/academics').then((response) => response.data);
export const getPortalAttendance = () => api.get('/portal/attendance').then((response) => response.data);
export const getPortalRequests = () => api.get('/portal/requests').then((response) => response.data);
export const getPortalServices = () => api.get('/portal/services').then((response) => response.data);
export const getPortalProfile = () => api.get('/portal/profile').then((response) => response.data);
export const getPortalCourse = () => api.get('/portal/course').then((response) => response.data);
export const getPortalModule = (id) => api.get(`/portal/modules/${id}`).then((response) => response.data);
export const getPortalOnlineClasses = () => api.get('/portal/online-classes').then((response) => response.data);
export const getPortalNotifications = () =>
  api.get('/portal/notifications').then((response) => response.data);
export const getPortalRequestTypes = () => api.get('/portal/request-types').then((response) => response.data);
export const createPortalRequest = (formData) =>
  api.post('/portal/requests', formData).then((response) => response.data);
export const getPortalRequestAttachmentUrl = (id) =>
  withToken(api.getUri({ url: `/portal/requests/attachments/${id}` }));

// Pesquisa de estudante (StudentLookUp): os mesmos dados do portal, apenas em modo de consulta.
// Cada função do portal que só lê dados deve ter aqui o equivalente.
const lookupPath = (code, path) => `/lookup/${encodeURIComponent(code)}/${path}`;
const lookupGet = (code, path) => api.get(lookupPath(code, path)).then((response) => response.data);
export const getLookupOverview = (code) => lookupGet(code, 'overview');
export const getLookupProfile = (code) => lookupGet(code, 'profile');
export const getLookupPayments = (code) => lookupGet(code, 'payments');
export const getLookupAcademics = (code) => lookupGet(code, 'academics');
export const getLookupAttendance = (code) => lookupGet(code, 'attendance');
export const getLookupRequests = (code) => lookupGet(code, 'requests');
export const getLookupServices = (code) => lookupGet(code, 'services');
export const getLookupCourse = (code) => lookupGet(code, 'course');
export const getLookupModule = (code, id) => lookupGet(code, `modules/${id}`);
export const getLookupOnlineClasses = (code) => lookupGet(code, 'online-classes');
export const getLookupNotifications = (code) => lookupGet(code, 'notifications');
export const getLookupRequestAttachmentUrl = (code, id) =>
  withToken(api.getUri({ url: lookupPath(code, `requests/attachments/${id}`) }));
export const getMobileMoneyBankAccounts = () =>
  api.get('/settings/mobile-money/banks').then((response) => response.data);
export const createMobileMoneyBankAccount = (bank) =>
  api.post('/settings/mobile-money/banks', bank).then((response) => response.data);
export const updateMobileMoneyBankAccount = (id, bank) =>
  api.put(`/settings/mobile-money/banks/${id}`, bank).then((response) => response.data);
export const deleteMobileMoneyBankAccount = (id) =>
  api.delete(`/settings/mobile-money/banks/${id}`).then((response) => response.data);
export const getMobileMoneyBanks = () =>
  api.get('/mobile-money/banks').then((response) => response.data);
export const getMobileMoneyWallets = () =>
  api.get('/mobile-money/wallets').then((response) => response.data);
export const getMobileMoneyPayables = (code) =>
  api.get(`/mobile-money/students/${encodeURIComponent(code)}/payables`).then((response) => response.data);
export const createMobileMoneyPayment = (payload) =>
  api.post('/mobile-money/payments', payload).then((response) => response.data);
export const getMobileMoneyTransactions = () =>
  api.get('/mobile-money/transactions').then((response) => response.data);
export const refreshMobileMoneyTransaction = (id) =>
  api.get(`/mobile-money/transactions/${id}`).then((response) => response.data);
export const getUserSettings = () =>
  api.get('/settings/users').then((response) => response.data);
export const updateUserSettings = (settings) =>
  api.put('/settings/users', settings).then((response) => response.data);

export const getNotificationSettings = (channel) =>
  api.get(`/settings/notifications/${channel}`).then((response) => response.data);
export const updateNotificationSettings = (channel, settings) =>
  api.put(`/settings/notifications/${channel}`, settings).then((response) => response.data);
export const getNotificationMessages = (channel) =>
  api
    .get('/notifications/messages', { params: channel ? { channel } : {} })
    .then((response) => response.data);
export const sendNotificationMessage = (message) =>
  api.post('/notifications/messages', message).then((response) => response.data);
export const resendNotificationMessage = (id) =>
  api.post(`/notifications/messages/${id}/resend`).then((response) => response.data);

export const getExpenseCatalog = (kind) =>
  api
    .get('/expenses/catalog', { params: kind ? { kind } : {} })
    .then((response) => response.data);
export const createExpenseCatalogItem = (item) =>
  api.post('/expenses/catalog', item).then((response) => response.data);
export const updateExpenseCatalogItem = (id, item) =>
  api.put(`/expenses/catalog/${id}`, item).then((response) => response.data);
export const setExpenseCatalogItemActive = (id, active) =>
  api.patch(`/expenses/catalog/${id}/activation`, { active }).then((response) => response.data);
export const deleteExpenseCatalogItem = (id) => api.delete(`/expenses/catalog/${id}`);

const expenseRecordPaths = {
  expenses: '/expenses/requests',
  purchases: '/expenses/purchases',
  returns: '/expenses/returns',
  sales: '/expenses/sales',
};
export const getExpenseRecords = (kind) =>
  api.get(expenseRecordPaths[kind]).then((response) => response.data);
export const createExpenseRecord = (kind, record) =>
  api.post(expenseRecordPaths[kind], record).then((response) => response.data);
export const setExpenseRecordStatus = (kind, id, status) =>
  api.patch(`${expenseRecordPaths[kind]}/${id}/status`, { status }).then((response) => response.data);
export const forwardExpenseRecord = (kind, id, staffId) =>
  api.put(`${expenseRecordPaths[kind]}/${id}/forward`, { staffId }).then((response) => response.data);
export const saveExpenseRecordNotes = (kind, id, notes) =>
  api.put(`${expenseRecordPaths[kind]}/${id}/notes`, { notes }).then((response) => response.data);
export const concludeExpenseRecord = (kind, id) =>
  api.post(`${expenseRecordPaths[kind]}/${id}/conclude`).then((response) => response.data);
export const resolveReturnRecord = (id, outcome, rejectionReason) =>
  api.post(`/expenses/returns/${id}/resolve`, { outcome, rejectionReason })
    .then((response) => response.data);
export const getForwardedRecords = () =>
  api.get('/expenses/forwarded').then((response) => response.data);

export const getStaffAttendanceRecords = (type) =>
  api.get(`/staff-attendances/${type}/records`).then((response) => response.data);
export const createStaffAttendanceRecord = (type, record) =>
  api.post(`/staff-attendances/${type}/records`, record).then((response) => response.data);
export const updateStaffAttendanceStatus = (type, id, status) =>
  api
    .patch(`/staff-attendances/${type}/records/${id}/status`, { status })
    .then((response) => response.data);
export const deleteStaffAttendanceRecord = (type, id) =>
  api.delete(`/staff-attendances/${type}/records/${id}`);
export const requestStaffAttendanceJustification = (type, id) =>
  api
    .post(`/staff-attendances/${type}/records/${id}/justification`)
    .then((response) => response.data);
export const payStaffAttendanceJustification = (type, id, payment) =>
  api
    .post(`/staff-attendances/${type}/records/${id}/justification/payment`, payment)
    .then((response) => response.data);
export const getStaffAttendanceExcesses = (type) =>
  api.get(`/staff-attendances/${type}/excesses`).then((response) => response.data);

export const getReceiptNumber = (kind, id) =>
  api.get(`/receipt-numbers/${kind}/${id}`).then((response) => response.data.number);
