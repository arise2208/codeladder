import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (username) config.headers["X-Username"] = username;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      localStorage.removeItem("role");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const getErrorMessage = (error, fallback = "Something went wrong.") =>
  error.response?.data?.message || error.response?.data?.error || fallback;

export default api;
