
import { http, HttpResponse } from 'msw'

let jobCounter = 0
const jobHits: Record<string, number> = {}

export const handlers = [
  http.post('/api/register', async () => HttpResponse.json({ ok: true }, { status: 200 })),

  http.post('/api/login', async () => HttpResponse.json({ token: 'dev-token', email: 'user@example.com' }, { status: 200 })),

  http.get('/api/projects', async () => {
    const now = new Date().toISOString()
    return HttpResponse.json([
      { id: 'p1', name: 'Проект 1', createdAt: now },
      { id: 'p2', name: 'Проект 2', createdAt: now },
    ], { status: 200 })
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
