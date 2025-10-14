
import axios from 'axios'

export const api = axios.create({ baseURL: '/api' })

export type RegisterPayload = { login: string; email: string; password: string }
export type AuthPayload = { login: string; password: string }
export type Project = { id: string; name: string; createdAt: string }
// Конфигурация расчёта. Включает параметры и таблицы процедур (12 столбцов каждая строка)
export type ComputeConfig = {
  geometry?: number[][]
  graphic?: number[][]
  baseCoords?: number[][] // [[node,x,y,z], ...]
  baseDistances?: number[] // [lc1, lc2, ...]
  baseNodes?: number[] // [n1, n2, ...]
}
export type JobStatus = { status: 'queued' | 'done'; mesh?: { type: 'box'; args: [number, number, number] } }

export async function registerUser(data: RegisterPayload) {
  const res = await api.post('/register', data)
  return res.data as { ok: true }
}

export async function loginUser(data: AuthPayload) {
  const res = await api.post('/login', data)
  return res.data as { token: string; email: string }
}

export async function listProjects() {
  const res = await api.get('/projects')
  return res.data as Project[]
}

// Импорт модели: dev-режим ожидает name и опционально filename, файл не обязателен
export async function importModel(payload: { name: string; filename?: string }) {
  const res = await api.post('/models/import', payload)
  return res.data as { ok: true; model: Project }
}

export async function createModel(payload: { name: string }) {
  const res = await api.post('/models/create', payload)
  return res.data as { ok: true; model: Project }
}

export async function deleteModel(id: string) {
  const res = await api.delete(`/models/${id}`)
  return res.data as { ok: true }
}

export async function saveConfig(projectId: string, cfg: ComputeConfig) {
  const res = await api.post(`/projects/${projectId}/config`, cfg)
  return res.data as { ok: true }
}

export async function requestCompute(projectId: string) {
  const res = await api.post(`/projects/${projectId}/compute`)
  return res.data as { jobId: string }
}

export async function getJob(jobId: string) {
  const res = await api.get(`/jobs/${jobId}`)
  return res.data as JobStatus
}

export async function getModelMesh(modelId: string) {
  const res = await api.get(`/models/${modelId}/mesh`)
  return res.data as { nodes: number[][]; elements: number[][] }
}
