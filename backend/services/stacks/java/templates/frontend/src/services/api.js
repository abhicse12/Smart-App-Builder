import axios from "axios";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// An expired or invalid token ends the session (a failed login attempt
// also returns 401, but it must stay on the form and show its message)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginAttempt = /\/auth\/(login|signup)$/.test(
      error.config?.url || ""
    );

    if (error.response?.status === 401 && !isLoginAttempt) {
      localStorage.removeItem("token");

      if (!["/login", "/signup"].includes(window.location.pathname)) {
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  }
);

// The server's { message }, for showing errors to the user
export const getErrorMessage = (error, fallback = "Something went wrong") =>
  error.response?.data?.message || fallback;

export default api;
