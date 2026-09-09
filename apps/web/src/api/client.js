import axios from "axios";

const AUTH_API = import.meta.env.VITE_AUTH_API_URL;
const WALLET_API = import.meta.env.VITE_WALLET_API_URL;
const PAYMENT_API = import.meta.env.VITE_PAYMENT_API_URL;


const withAuth = (instance) => {
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  return instance;
};

export const authApi = withAuth(axios.create({ baseURL: AUTH_API }));
export const walletApi = withAuth(axios.create({ baseURL: WALLET_API }));
export const paymentApi = withAuth(axios.create({ baseURL: PAYMENT_API }));
