import api from './client';

export const adminAPI = {
  getStats:        ()              => api.get('/admin/stats'),
  getUsers:        (params)        => api.get('/admin/users', { params }),
  updateUser:      (id, data)      => api.put(`/admin/users/${id}`, data),
  deleteUser:      (id)            => api.delete(`/admin/users/${id}`),
  getTrainers:     ()              => api.get('/admin/trainers'),
  createTrainer:   (data)          => api.post('/admin/trainers', data),
  updateTrainer:   (id, data)      => api.put(`/admin/trainers/${id}`, data),
  deleteTrainer:   (id)            => api.delete(`/admin/trainers/${id}`),
  getActivity:     ()              => api.get('/admin/activity'),
};
