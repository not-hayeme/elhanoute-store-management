import axios from "axios";

// Centralized API client for the Render backend
const BASE = "https://backendhanout.onrender.com/api";

// Default axios instance for code that imports `api` as default
const api = axios.create({ baseURL: BASE });
export default api;

// Item-specific old helpers kept for backward compatibility with existing components
const ITEMS_URL = `${BASE}/items`;
export const getItems = async () => axios.get(ITEMS_URL);
export const addItem = async (data) => {
  // allow formdata for file uploads
  const headers = data instanceof FormData ? { "Content-Type": "multipart/form-data" } : {};
  return axios.post(ITEMS_URL, data, { headers });
};
export const updateItem = async (id, data) => axios.put(`${ITEMS_URL}/${id}`, data);
export const deleteItem = async (id) => axios.delete(`${ITEMS_URL}/${id}`);

// Generic CRUD helpers for other models: model should be the plural resource name, e.g. 'users', 'stores'
export const getAll = async (model) => axios.get(`${BASE}/${model}`);
export const getOne = async (model, id) => axios.get(`${BASE}/${model}/${id}`);
export const createOne = async (model, data) => {
  const headers = data instanceof FormData ? { "Content-Type": "multipart/form-data" } : {};
  return axios.post(`${BASE}/${model}`, data, { headers });
};
export const updateOne = async (model, id, data) => axios.put(`${BASE}/${model}/${id}`, data);
export const deleteOne = async (model, id) => axios.delete(`${BASE}/${model}/${id}`);

// Helper for building absolute URLs to files served by the backend (images, uploads)
export const fileUrl = (path) => {
  if (!path) return null;
  // If path already starts with http, return it
  if (path.startsWith("http")) return path;
  // Trim leading slash
  return `https://backendhanout.onrender.com/${path.replace(/^\//, "")}`;
};
