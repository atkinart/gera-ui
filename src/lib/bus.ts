
import mitt from 'mitt'

type Events = {
  'compute:started': { jobId: string }
  'compute:done': { jobId: string }
}

export const bus = mitt<Events>()
