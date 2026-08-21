import axios from 'axios';

const REFRESH_TOKEN_STORAGE_KEY = 'examvault.refreshToken';

let accessToken: string | null = null;
let authFailureHandler: (() => void) | null = null;

// localStorage is shared by every tab on this origin - without this cache, a
// second tab logging in as a different user overwrites the one stored
// refresh token, and this tab's next silent refresh would silently pick up
// the OTHER tab's session (observed as an already-mid-exam student tab
// getting logged into whatever account was last opened elsewhere). Caching
// the value in memory the first time this tab reads it (page load, or its
// own login) makes each tab authoritative over its own session from then on
// - it stops reacting to storage writes made by other tabs, while a brand
// new tab still correctly inherits whatever session is currently persisted.
let cachedRefreshToken: string | null | undefined;
let cachedRemember = true;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getRefreshToken(): string | null {
  if (cachedRefreshToken !== undefined) {
    return cachedRefreshToken;
  }
  const fromLocal = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  const fromSession = sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  cachedRefreshToken = fromLocal ?? fromSession;
  cachedRemember = fromLocal !== null;
  return cachedRefreshToken;
}

/**
 * remember=true persists the token across browser restarts (localStorage);
 * remember=false keeps it only for the current tab session (sessionStorage),
 * driven by the login form's "Remember me" checkbox.
 */
export function setRefreshToken(token: string | null, remember = true) {
  cachedRefreshToken = token;
  cachedRemember = remember;
  if (!token) {
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    return;
  }
  if (remember) {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
    sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  } else {
    sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
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

  const remember = cachedRemember;
  try {
    const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${import.meta.env.VITE_API_BASE_URL}/api/users/refresh-token`,
      { refreshToken },
    );
    accessToken = data.accessToken;
    setRefreshToken(data.refreshToken, remember);
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
