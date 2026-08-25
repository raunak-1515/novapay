import axios from "axios";

const AUTH_API = "http://localhost:4001";
const WALLET_API = "http://localhost:4002";
const PAYMENT_API = "http://localhost:4003";

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
