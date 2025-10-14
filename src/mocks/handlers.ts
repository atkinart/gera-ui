
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

  // Mesh for visualization: nodes (x,y,z) and elements (triangles as node indices)
  http.get('/api/models/:id/mesh', async ({ params }) => {
    const id = params.id as string
    // Simple param-based variation: different radius per model id
    const radius = id === 'p2' ? 3.5 : 3
    const { nodes, elements } = generateDomeMesh(10, radius)
    return HttpResponse.json({ nodes, elements }, { status: 200 })
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

  // Создание модели (dev)
  http.post('/api/models/create', async ({ request }) => {
    const body = (await request.json()) as { name?: string }
    const modelName = (body?.name ?? '').trim()
    if (!modelName) {
      return HttpResponse.json({ error: 'Имя модели не может быть пустым' }, { status: 400 })
    }
    const exists = models.some(m => m.name.trim().toLowerCase() === modelName.toLowerCase())
    if (exists) {
      return HttpResponse.json({ error: 'Модель с таким именем уже существует' }, { status: 409 })
    }
    const created: Model = {
      id: `p${models.length + 1}`,
      name: modelName,
      createdAt: new Date().toISOString(),
    }
    models = [...models, created]
    return HttpResponse.json({ ok: true, model: created }, { status: 200 })
  }),

  // Удаление модели (dev)
  http.delete('/api/models/:id', async ({ params }) => {
    const id = params.id as string
    const before = models.length
    models = models.filter(m => m.id !== id)
    const changed = models.length !== before
    if (!changed) {
      return HttpResponse.json({ error: 'Модель не найдена' }, { status: 404 })
    }
    return HttpResponse.json({ ok: true }, { status: 200 })
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

// --- Helpers ---
function generateDomeMesh(segments = 12, R = 3) {
  // Build a small dome: top + 3 latitude rings (30°, 60°, 90°)
  const deg = (a: number) => (a * Math.PI) / 180
  const thetas = [30, 60, 90].map(deg) // from top
  const nodes: number[][] = []
  const elements: number[][] = []

  // Top node
  const top = nodes.push([0, R, 0]) - 1

  // Rings
  const rings: number[][] = []
  for (const theta of thetas) {
    const y = R * Math.cos(theta)
    const r = R * Math.sin(theta)
    const ringIdxs: number[] = []
    for (let s = 0; s < segments; s++) {
      const phi = (2 * Math.PI * s) / segments
      const x = r * Math.cos(phi)
      const z = r * Math.sin(phi)
      ringIdxs.push(nodes.push([x, y, z]) - 1)
    }
    rings.push(ringIdxs)
  }

  // Top fan (top to first ring)
  const ring1 = rings[0]
  for (let i = 0; i < segments; i++) {
    const a = ring1[i]
    const b = ring1[(i + 1) % segments]
    elements.push([top, a, b])
  }

  // Bands between rings (triangulated quads)
  const addBand = (upper: number[], lower: number[]) => {
    for (let i = 0; i < segments; i++) {
      const a = upper[i]
      const b = upper[(i + 1) % segments]
      const c = lower[i]
      const d = lower[(i + 1) % segments]
      elements.push([a, c, b])
      elements.push([b, c, d])
    }
  }
  addBand(rings[0], rings[1])
  addBand(rings[1], rings[2])

  return { nodes, elements }
}
