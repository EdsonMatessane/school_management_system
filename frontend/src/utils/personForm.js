import { systemDate } from './systemDate';
import { parseDisplayDate } from './date';

export const dateFields = new Set(['birthDate', 'issueDate', 'expiryDate']);

export const getFieldError = (field, value, form) => {
  if (value == null || value === '') return '';
  if (field === 'biNumber' && !/^\d{12}[A-Za-z]$/.test(value.trim())) {
    return 'Use 12 algarismos seguidos de uma letra.';
  }
  if (field === 'nuit' && !/^\d{9}$/.test(value.trim())) {
    return 'O NUIT deve conter 9 algarismos.';
  }
  if (['phone', 'whatsappNumber', 'smsNumber'].includes(field)) {
    const phone = value.replace(/[\s()-]/g, '');
    const local = phone.startsWith('+258') ? phone.slice(4) : phone;
    if (!/^(?:8[2-7]\d{7}|2[1-9]\d{6})$/.test(local)) {
      return 'Indique um número de telefone válido de Moçambique.';
    }
  }
  if (field === 'email' && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value.trim())) {
    return 'Indique um endereço de email válido.';
  }
  if (dateFields.has(field)) {
    const date = parseDisplayDate(value);
    if (!date) return 'Use uma data válida no formato DD/MM/AAAA.';
    const currentDate = systemDate();
    const today = [
      currentDate.getFullYear(),
      String(currentDate.getMonth() + 1).padStart(2, '0'),
      String(currentDate.getDate()).padStart(2, '0'),
    ].join('-');
    if (field === 'birthDate' && date > today) return 'A data de nascimento não pode estar no futuro.';
    if (field === 'issueDate' && date > today) return 'A data de emissão não pode estar no futuro.';
    if (field === 'issueDate' && form.birthDate && date < parseDisplayDate(form.birthDate)) {
      return 'A emissão não pode ser anterior ao nascimento.';
    }
    if (field === 'expiryDate' && form.issueDate && date <= parseDisplayDate(form.issueDate)) {
      return 'A validade deve ser posterior à emissão.';
    }
  }
  return '';
};

export const maskBiNumber = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  const letter = value.replace(/[^a-z]/gi, '').slice(-1);
  return digits.length === 12 ? digits + letter : digits;
};

export const maskDigits = (value, maxLength) => value.replace(/\D/g, '').slice(0, maxLength);
