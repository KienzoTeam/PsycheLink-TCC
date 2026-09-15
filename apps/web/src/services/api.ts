import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3000', // Substitua pela URL do seu backend
});

// Anexa o token de autorização em todas as requisições enviadas
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('@app:token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});