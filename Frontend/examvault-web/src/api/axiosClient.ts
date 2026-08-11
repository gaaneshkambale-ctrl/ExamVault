import axios from 'axios';

const REFRESH_TOKEN_STORAGE_KEY = 'examvault.refreshToken';

let accessToken: string | null = null;
let authFailureHandler: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function setRefreshToken(token: string | null) {
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }
}

export function setAuthFailureHandler(handler: (() => void) | null) {
  authFailureHandler = handler;
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let pendingRefresh: Promise<string | null> | null = null;

async function refreshAccessTokenSilently(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${import.meta.env.VITE_API_BASE_URL}/api/users/refresh-token`,
      { refreshToken },
    );
    accessToken = data.accessToken;
    setRefreshToken(data.refreshToken);
    return data.accessToken;
  } catch {
    setRefreshToken(null);
    accessToken = null;
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retried) {
      originalRequest._retried = true;

      pendingRefresh ??= refreshAccessTokenSilently().finally(() => {
        pendingRefresh = null;
      });
      const newAccessToken = await pendingRefresh;

      if (newAccessToken) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      }

      authFailureHandler?.();
    }

    return Promise.reject(error);
  },
);

export default apiClient;
