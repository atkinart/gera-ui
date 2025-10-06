
import { describe, it, expect } from 'vitest'
import { requestCompute, getJob } from '@/lib/api'

describe('compute job flow', () => {
  it('returns job id and eventually delivers mesh', async () => {
    const { jobId } = await requestCompute('p1')
    expect(jobId).toMatch(/^job-/)

    let status = await getJob(jobId)
    let tries = 0
    while (status.status !== 'done' && tries < 5) {
      status = await getJob(jobId)
      tries++
    }
    expect(status.status).toBe('done')
    expect(status.mesh?.type).toBe('box')
  })
})
