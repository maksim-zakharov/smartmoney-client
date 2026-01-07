/**
 * Получает URL прокси из localStorage или возвращает значение по умолчанию
 * @returns URL прокси сервера
 */
export const getProxyUrl = (): string => {
  return localStorage.getItem('proxyUrl') || 'http://5.35.13.149';
};

