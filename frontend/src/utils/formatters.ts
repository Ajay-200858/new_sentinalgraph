export const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleString();
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(num);
};
