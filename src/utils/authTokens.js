const ACCESS_TOKEN_KEY = 'auth.accessToken';
const REFRESH_TOKEN_KEY = 'auth.refreshToken';

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

export const setTokens = ({ accessToken, refreshToken }) => {
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }

  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
};

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const extractTokens = (payload = {}) => {
  // Check nested data structure first (common in REST APIs)
  const accessToken =
    payload.data?.accessToken ||
    payload.data?.AccessToken ||
    payload.accessToken ||
    payload.AccessToken ||
    payload.token ||
    payload.jwt ||
    null;

  const refreshToken =
    payload.data?.refreshToken ||
    payload.data?.RefreshToken ||
    payload.data?.refresh_token ||
    payload.refreshToken ||
    payload.RefreshToken ||
    payload.refresh_token ||
    null;

  return { accessToken, refreshToken };
};
