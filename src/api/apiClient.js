import axios from 'axios';
import {
  clearTokens,
  extractTokens,
  getAccessToken,
  getRefreshToken,
  setTokens
} from '../utils/authTokens';

const REFRESH_URL =
  process.env.REACT_APP_REFRESH_URL || '/auth/v1/refresh';

const apiClient = axios.create({
  withCredentials: false  // Allows wildcard CORS, but token still sent via Authorization header
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const unauthorized = error.response?.status === 401;

    if (!unauthorized || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      clearTokens();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const refreshResponse = await axios.post(REFRESH_URL, { refreshToken });
      const tokens = extractTokens(refreshResponse.data);

      if (!tokens.accessToken) {
        throw new Error('Refresh response did not contain an access token');
      }

      setTokens({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || refreshToken
      });

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      clearTokens();
      return Promise.reject(refreshError);
    }
  }
);

export default apiClient;
