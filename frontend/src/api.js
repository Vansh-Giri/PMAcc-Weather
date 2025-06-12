import axios from "axios";

const API_BASE = "http://localhost:8000";

export const getProfiles = () => axios.get(`${API_BASE}/profiles/`);
export const createProfile = (data) => axios.post(`${API_BASE}/profiles/`, data);
export const updateProfile = (id, data) => axios.put(`${API_BASE}/profiles/${id}`, data);
export const deleteProfile = (id) => axios.delete(`${API_BASE}/profiles/${id}`);
export const getProfileWeather = (id) => axios.get(`${API_BASE}/profiles/${id}/weather`);
export const getForecast = (location) => axios.get(`${API_BASE}/forecast`, { params: { location } });
export const exportProfilesCSV = () => {
  return axios.get(`${API_BASE}/export`);
};
