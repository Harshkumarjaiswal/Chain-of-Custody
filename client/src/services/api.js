import axios from 'axios';

const API = axios.create({
    baseURL: '/api'
});

// Attach JWT token to every request
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth
export const register = (data) => API.post('/auth/register', data);
export const registerSendOtp = (data) => API.post('/auth/register/send-otp', data);
export const registerVerifyOtp = (data) => API.post('/auth/register/verify-otp', data);
export const login = (data) => API.post('/auth/login', data);
export const verifyOtp = (data) => API.post('/auth/verify-otp', data);
export const getMe = () => API.get('/auth/me');
export const getUsers = () => API.get('/auth/users');
export const updateUserRole = (id, role) => API.put(`/auth/users/${id}/role`, { role });
export const toggleUser = (id) => API.put(`/auth/users/${id}/toggle`);

// Cases
export const getCases = (params) => API.get('/cases', { params });
export const getCase = (id) => API.get(`/cases/${id}`);
export const createCase = (data) => API.post('/cases', data);
export const updateCase = (id, data) => API.put(`/cases/${id}`, data);
export const deleteCase = (id) => API.delete(`/cases/${id}`);
export const getCaseStats = () => API.get('/cases/stats/overview');

// Evidence
export const getEvidenceByCase = (caseId) => API.get(`/evidence/case/${caseId}`);
export const getEvidenceDetail = (id) => API.get(`/evidence/detail/${id}`);
export const uploadEvidence = (caseId, formData) => API.post(`/evidence/upload/${caseId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const verifyEvidence = (id) => API.post(`/evidence/verify/${id}`);
export const getAllEvidence = () => API.get('/evidence/all');

// Custody
export const getCustodyLog = (evidenceId) => API.get(`/custody/${evidenceId}`);
export const getAllCustodyLogs = (limit) => API.get('/custody', { params: { limit } });

// Tasks
export const getTasks = (params) => API.get('/tasks', { params });
export const createTask = (data) => API.post('/tasks', data);
export const respondToTask = (id, data) => API.put(`/tasks/${id}/respond`, data);
export const updateTaskStatus = (id, status) => API.put(`/tasks/${id}/status`, { status });

// Findings
export const getFindings = (evidenceId) => API.get(`/findings/${evidenceId}`);
export const addFinding = (evidenceId, data) => API.post(`/findings/${evidenceId}`, data);
export const deleteFinding = (id) => API.delete(`/findings/${id}`);

// AI
export const summarizeFindings = (evidenceId) => API.post(`/ai/summarize/${evidenceId}`);

// Reports
export const generateReport = (caseId) => API.get(`/reports/${caseId}`, { responseType: 'blob' });

export default API;
