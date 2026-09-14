export const isValidIp = (ip: string): boolean => {
  const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  return ipRegex.test(ip);
};

export const isNotEmpty = (val: string): boolean => {
  return val.trim().length > 0;
};
