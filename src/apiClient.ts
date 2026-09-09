import axios from 'axios';

// Live Production Vercel Serverless or Local Development Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL.replace(/\/$/, '')}/api`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Response Interceptor for clean data extraction
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('Jameendar API Error:', error.response?.data || error.message);
    return Promise.reject(error.response?.data || error);
  }
);
