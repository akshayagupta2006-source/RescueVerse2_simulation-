import api from './api';

export const saveResult = (payload) => api.post('/results', payload);
export const getMyResults = () => api.get('/results/my');
export const getLeaderboard = () => api.get('/results/leaderboard');
export const getResultById = (id) => api.get(`/results/${id}`);
export const getActiveScenarios = () => api.get('/scenarios/active');
export const getAllScenarios = () => api.get('/scenarios');
export const getPersonalAnalytics = () => api.get('/analytics/me');
