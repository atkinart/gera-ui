
import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { saveConfig, requestCompute, getJob } from '@/lib/api'
import useWorkspace from '@/store/workspace'
import { bus } from '@/lib/bus'

export default function ConfigPanel() {
  const { selectedProjectId, setJobId, lastJobId } = useWorkspace()
  const [paramA, setParamA] = useState(10)
  const [paramB, setParamB] = useState(20)

  const disableActions = !selectedProjectId

  const save = useMutation({ mutationFn: () => saveConfig(selectedProjectId!, { paramA, paramB }) })
  const compute = useMutation({
    mutationFn: () => requestCompute(selectedProjectId!),
    onSuccess: (data) => {
      setJobId(data.jobId)
      bus.emit('compute:started', { jobId: data.jobId })
    }
  })

  const jobQuery = useQuery({
    queryKey: ['job', lastJobId],
    queryFn: () => getJob(lastJobId!),
    enabled: !!lastJobId,
    refetchInterval: (q) => (q.state.data?.status === 'done' ? false : 1000),
  })

  useEffect(() => {
    if (jobQuery.data?.status === 'done') {
      bus.emit('compute:done', { jobId: lastJobId! })
    }
  }, [jobQuery.data, lastJobId])

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Конфигурация</h3>
      <p className="text-sm text-slate-600">Проект: <b>{selectedProjectId ?? 'не выбран'}</b></p>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm">Параметр A</span>
          <input type="number" value={paramA} onChange={(e)=>setParamA(parseFloat(e.target.value))} className="mt-1 w-full rounded-md border px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm">Параметр B</span>
          <input type="number" value={paramB} onChange={(e)=>setParamB(parseFloat(e.target.value))} className="mt-1 w-full rounded-md border px-3 py-2" />
        </label>
      </div>
      <div className="flex gap-2">
        <button onClick={()=>save.mutate()} className="brand-btn" disabled={save.isPending || disableActions}>
          {save.isPending?'Сохранение...':'Сохранить'}
        </button>
        <button onClick={()=>compute.mutate()} className="px-4 py-2 rounded-md border border-slate-300" disabled={compute.isPending || disableActions}>
          {compute.isPending?'Запрос...':'Запустить расчёт'}
        </button>
      </div>
      {save.isSuccess && <p className="text-green-700">Сохранено.</p>}
      {compute.isSuccess && <p className="text-slate-700">Задача: {lastJobId}</p>}
      {jobQuery.isFetching && <p className="text-slate-500">Статус: ожидаем результат…</p>}
      {jobQuery.data?.status === 'done' && <p className="text-green-700">Готово. Вьюер обновлён.</p>}
    </div>
  )
}
