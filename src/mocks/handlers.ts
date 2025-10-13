
import { http, HttpResponse } from 'msw'

let jobCounter = 0
const jobHits: Record<string, number> = {}
// Хранилище моделей (ранее «проекты») в памяти для dev-режима
type Model = { id: string; name: string; createdAt: string }
const nowInit = new Date().toISOString()
let models: Model[] = [
  { id: 'p1', name: 'Модель 1', createdAt: nowInit },
  { id: 'p2', name: 'Модель 2', createdAt: nowInit },
]

export const handlers = [
  http.post('/api/register', async () => HttpResponse.json({ ok: true }, { status: 200 })),

  http.post('/api/login', async () => HttpResponse.json({ token: 'dev-token', email: 'user@example.com' }, { status: 200 })),

  http.get('/api/projects', async () => {
    return HttpResponse.json(models, { status: 200 })
  }),

  // Импорт модели (dev): добавляет запись, если name != 'fail', иначе ошибка
  http.post('/api/models/import', async ({ request }) => {
    const body = (await request.json()) as { name?: string; filename?: string }
    const rawName = (body?.name ?? '').trim()
    const modelName = rawName || (body?.filename ?? '').replace(/\.[^.]+$/, '') || 'Безымянная модель'
    if (modelName.toLowerCase() === 'fail') {
      return HttpResponse.json({ error: 'модель не прошла провеку' }, { status: 400 })
    }
    const created: Model = {
      id: `p${models.length + 1}`,
      name: modelName,
      createdAt: new Date().toISOString(),
    }
    models = [...models, created]
    return HttpResponse.json({ ok: true, model: created }, { status: 200 })
  }),

  http.post('/api/projects/:id/config', async () => HttpResponse.json({ ok: true }, { status: 200 })),

  http.post('/api/projects/:id/compute', async () => {
    jobCounter += 1
    const jobId = `job-${jobCounter}`
    jobHits[jobId] = 0
    return HttpResponse.json({ jobId }, { status: 200 })
  }),

  http.get('/api/jobs/:jobId', async ({ params }) => {
    const id = params.jobId as string
    jobHits[id] = (jobHits[id] ?? 0) + 1
    if (jobHits[id] < 3) {
      return HttpResponse.json({ status: 'queued' }, { status: 200 })
    }
    return HttpResponse.json({ status: 'done', mesh: { type: 'box', args: [1.2, 0.8, 1.0] } }, { status: 200 })
  }),
]
