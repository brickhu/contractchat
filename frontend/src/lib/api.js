import { API_BASE, selectedNetwork } from '../stores/app'

const get  = url => fetch(`${API_BASE}${url}`).then(r => r.json())
const post = (url, body) => fetch(`${API_BASE}${url}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
}).then(r => r.json())

export const api = {
  // Models
  models: () => get('/api/models'),

  // ABI + skill matching
  abi: (address) => get(`/api/abi/${address}?chain=${selectedNetwork()}`),

  // Skills
  skills: () => get('/api/skills'),
  skill: (id) => get(`/api/skills/${id}`),

  // Contract discovery (curated list)
  discover: (chain) => get(`/api/discover?chain=${chain || selectedNetwork()}`),

  // Chat
  chat: (body) => post('/api/chat', body),

  // Admin (requires token)
  admin: {
    login: (password) => post('/admin/api/login', { password }),

    skills: {
      list:   (token) => authed(token).get('/admin/api/skills'),
      create: (token, data) => authed(token).post('/admin/api/skills', data),
      update: (token, id, data) => authed(token).put(`/admin/api/skills/${id}`, data),
      delete: (token, id) => authed(token).del(`/admin/api/skills/${id}`),
    },

    contracts: {
      list:   (token) => authed(token).get('/admin/api/contracts'),
      create: (token, data) => authed(token).post('/admin/api/contracts', data),
      update: (token, id, data) => authed(token).put(`/admin/api/contracts/${id}`, data),
      delete: (token, id) => authed(token).del(`/admin/api/contracts/${id}`),
    },

    config: {
      get:  (token) => authed(token).get('/admin/api/config'),
      save: (token, data) => authed(token).post('/admin/api/config', data),
    }
  }
}

function authed(token) {
  const h = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  return {
    get:  url => fetch(`${API_BASE}${url}`, { headers: h }).then(r => r.json()),
    post: (url, body) => fetch(`${API_BASE}${url}`, { method: 'POST', headers: h, body: JSON.stringify(body) }).then(r => r.json()),
    put:  (url, body) => fetch(`${API_BASE}${url}`, { method: 'PUT', headers: h, body: JSON.stringify(body) }).then(r => r.json()),
    del:  url => fetch(`${API_BASE}${url}`, { method: 'DELETE', headers: h }).then(r => r.json()),
  }
}
