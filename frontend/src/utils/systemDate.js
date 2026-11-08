let systemYear = null;

export const setSystemYear = (year) => {
  systemYear = Number.isInteger(year) ? year : null;
};

export const getSystemYear = () => systemYear;

export const systemDate = () => {
  const date = new Date();
  if (systemYear && systemYear < date.getFullYear()) {
    const day = date.getDate();
    date.setDate(1);
    date.setFullYear(systemYear);
    const lastDay = new Date(systemYear, date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, lastDay));
  }
  return date;
};
