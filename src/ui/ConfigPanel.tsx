
import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { saveConfig, requestCompute, getJob } from '@/lib/api'
import useWorkspace from '@/store/workspace'
import { bus } from '@/lib/bus'

export default function ConfigPanel() {
  const { selectedProjectId, setJobId, lastJobId } = useWorkspace()
  // Таблицы процедур (12 столбцов): j1..j12
  const emptyRow = () => Array.from({ length: 12 }, () => 0)
  const [geomRows, setGeomRows] = useState<number[][]>([emptyRow()])
  const [graphRows, setGraphRows] = useState<number[][]>([])
  const [geomSelected, setGeomSelected] = useState<number | null>(null)
  const [graphSelected, setGraphSelected] = useState<number | null>(null)
  // Базовые параметры
  const [baseCoords, setBaseCoords] = useState<number[][]>([])
  const [baseDistances, setBaseDistances] = useState<number[]>([])
  const [baseNodes, setBaseNodes] = useState<number[]>([])
  const [coordsSelected, setCoordsSelected] = useState<number | null>(null)
  const [distSelected, setDistSelected] = useState<number | null>(null)
  const [nodeSelected, setNodeSelected] = useState<number | null>(null)

  const disableActions = !selectedProjectId

  const save = useMutation({ mutationFn: () => saveConfig(selectedProjectId!, { geometry: geomRows, graphic: graphRows, baseCoords, baseDistances, baseNodes }) })
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
    <div className="space-y-4">
      <h3 className="font-semibold">Конфигурация</h3>
      <p className="text-sm text-slate-600">Модель: <b>{selectedProjectId ?? 'не выбрана'}</b></p>

      {/* Геометрические процедуры */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">Геометрические процедуры</h4>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGeomRows(r => [...r, emptyRow()])}
              className="px-3 py-1.5 rounded border hover:bg-slate-50 text-sm"
              title="Добавить строку"
            >Добавить</button>
            <button
              onClick={() => geomSelected!=null && setGeomRows(r => r.filter((_,i)=>i!==geomSelected))}
              className={`px-3 py-1.5 rounded border text-sm ${geomSelected==null?'opacity-50 cursor-not-allowed':'hover:bg-red-50 border-red-300 text-red-700'}`}
              disabled={geomSelected==null}
              title="Удалить выбранную строку"
            >Удалить</button>
          </div>
        </div>
        <ProcTable
          rows={geomRows}
          onChange={(rows)=>setGeomRows(rows)}
          selected={geomSelected}
          onSelect={setGeomSelected}
        />
        <ProcLegend />
      </section>

      {/* Графические процедуры */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">Графические процедуры</h4>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGraphRows(r => [...r, emptyRow()])}
              className="px-3 py-1.5 rounded border hover:bg-slate-50 text-sm"
              title="Добавить строку"
            >Добавить</button>
            <button
              onClick={() => graphSelected!=null && setGraphRows(r => r.filter((_,i)=>i!==graphSelected))}
              className={`px-3 py-1.5 rounded border text-sm ${graphSelected==null?'opacity-50 cursor-not-allowed':'hover:bg-red-50 border-red-300 text-red-700'}`}
              disabled={graphSelected==null}
              title="Удалить выбранную строку"
            >Удалить</button>
          </div>
        </div>
        <ProcTable
          rows={graphRows}
          onChange={(rows)=>setGraphRows(rows)}
          selected={graphSelected}
          onSelect={setGraphSelected}
        />
        <ProcLegend />
      </section>

      {/* Базовые координаты */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">Базовые координаты</h4>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBaseCoords(r => [...r, [0,0,0]])}
              className="px-3 py-1.5 rounded border hover:bg-slate-50 text-sm"
              title="Добавить строку"
            >Добавить</button>
            <button
              onClick={() => coordsSelected!=null && setBaseCoords(r => r.filter((_,i)=>i!==coordsSelected))}
              className={`px-3 py-1.5 rounded border text-sm ${coordsSelected==null?'opacity-50 cursor-not-allowed':'hover:bg-red-50 border-red-300 text-red-700'}`}
              disabled={coordsSelected==null}
              title="Удалить выбранную строку"
            >Удалить</button>
          </div>
        </div>
        <CoordsTable rows={baseCoords} onChange={setBaseCoords} selected={coordsSelected} onSelect={setCoordsSelected} />
      </section>

      {/* Базовые расстояния */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">Базовые расстояния</h4>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBaseDistances(r => [...r, 0])}
              className="px-3 py-1.5 rounded border hover:bg-slate-50 text-sm"
              title="Добавить строку"
            >Добавить</button>
            <button
              onClick={() => distSelected!=null && setBaseDistances(r => r.filter((_,i)=>i!==distSelected))}
              className={`px-3 py-1.5 rounded border text-sm ${distSelected==null?'opacity-50 cursor-not-allowed':'hover:bg-red-50 border-red-300 text-red-700'}`}
              disabled={distSelected==null}
              title="Удалить выбранную строку"
            >Удалить</button>
          </div>
        </div>
        <OneColTable
          header="lc"
          rows={baseDistances}
          onChange={setBaseDistances}
          selected={distSelected}
          onSelect={setDistSelected}
        />
      </section>

      {/* Базовые узлы */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">Базовые узлы</h4>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBaseNodes(r => [...r, 0])}
              className="px-3 py-1.5 rounded border hover:bg-slate-50 text-sm"
              title="Добавить строку"
            >Добавить</button>
            <button
              onClick={() => nodeSelected!=null && setBaseNodes(r => r.filter((_,i)=>i!==nodeSelected))}
              className={`px-3 py-1.5 rounded border text-sm ${nodeSelected==null?'opacity-50 cursor-not-allowed':'hover:bg-red-50 border-red-300 text-red-700'}`}
              disabled={nodeSelected==null}
              title="Удалить выбранную строку"
            >Удалить</button>
          </div>
        </div>
        <OneColTable
          header="узел"
          rows={baseNodes}
          onChange={setBaseNodes}
          selected={nodeSelected}
          onSelect={setNodeSelected}
        />
      </section>

      {/* Действия */}
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

type ProcTableProps = {
  rows: number[][]
  onChange: (rows: number[][]) => void
  selected: number | null
  onSelect: (idx: number | null) => void
}

function ProcTable({ rows, onChange, selected, onSelect }: ProcTableProps) {
  const setCell = (r: number, c: number, v: number) => {
    onChange(rows.map((row, i) => i===r ? row.map((val, j)=> j===c ? v : val) : row))
  }
  const headers = Array.from({ length: 12 }, (_,i)=>`j${i+1}`)
  return (
    <div className="overflow-auto border rounded">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 sticky top-0">
          <tr>
            <th className="px-2 py-1 border-r w-8">#</th>
            {headers.map(h => (
              <th key={h} className="px-2 py-1 border-r text-left whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length===0 && (
            <tr><td colSpan={13} className="px-3 py-3 text-center text-slate-500">Нет строк</td></tr>
          )}
          {rows.map((row, i) => (
            <tr key={i} className={`${selected===i?'bg-green-50':''} hover:bg-slate-50 cursor-pointer`} onClick={()=>onSelect(i)}>
              <td className="px-2 py-1 border-r text-slate-500">{i+1}</td>
              {Array.from({ length: 12 }).map((_, j) => (
                <td key={j} className="px-1 py-1 border-r">
                  <input
                    type="number"
                    value={String(row?.[j] ?? 0)}
                    onChange={(e)=>setCell(i, j, parseFloat(e.target.value || '0'))}
                    className="w-20 border rounded px-2 py-1"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ProcLegend() {
  return (
    <details className="mt-2 text-xs text-slate-600">
      <summary className="cursor-pointer select-none text-slate-700">Пояснения j1..j12</summary>
      <div className="mt-2 space-y-1">
        <div><b>j1</b> — код процедуры</div>
        <div><b>j2..j7</b> — индексы целевых/опорных узлов</div>
        <div><b>j8..j9</b> — индексы расстояний (lc) или доп. узлы</div>
        <div><b>j10</b> — опорный узел/центр/эталон</div>
        <div><b>j11</b> — код плоскости/выбора (1: XY, 2: XZ, 3: YZ)</div>
        <div><b>j12</b> — флаг направления/режима</div>
      </div>
    </details>
  )
}

type CoordsTableProps = {
  rows: number[][]
  onChange: (rows: number[][]) => void
  selected: number | null
  onSelect: (idx: number | null) => void
}

function CoordsTable({ rows, onChange, selected, onSelect }: CoordsTableProps) {
  const setCell = (r: number, c: number, v: number) => {
    onChange(rows.map((row, i) => i===r ? row.map((val, j)=> j===c ? v : val) : row))
  }
  return (
    <div className="overflow-auto border rounded">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 sticky top-0">
          <tr>
            <th className="px-2 py-1 border-r w-8">#</th>
            <th className="px-2 py-1 border-r text-left">X</th>
            <th className="px-2 py-1 border-r text-left">Y</th>
            <th className="px-2 py-1 border-r text-left">Z</th>
          </tr>
        </thead>
        <tbody>
          {rows.length===0 && (
            <tr><td colSpan={4} className="px-3 py-3 text-center text-slate-500">Нет строк</td></tr>
          )}
          {rows.map((row, i) => (
            <tr key={i} className={`${selected===i?'bg-green-50':''} hover:bg-slate-50 cursor-pointer`} onClick={()=>onSelect(i)}>
              <td className="px-2 py-1 border-r text-slate-500">{i+1}</td>
              {[0,1,2].map((j) => (
                <td key={j} className="px-1 py-1 border-r">
                  <input
                    type="number"
                    value={String(row?.[j] ?? 0)}
                    onChange={(e)=>setCell(i, j, parseFloat(e.target.value || '0'))}
                    className="w-24 border rounded px-2 py-1"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type OneColTableProps = {
  header: string
  rows: number[]
  onChange: (rows: number[]) => void
  selected: number | null
  onSelect: (idx: number | null) => void
}

function OneColTable({ header, rows, onChange, selected, onSelect }: OneColTableProps) {
  const setCell = (r: number, v: number) => {
    onChange(rows.map((val, i) => i===r ? v : val))
  }
  return (
    <div className="overflow-auto border rounded">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 sticky top-0">
          <tr>
            <th className="px-2 py-1 border-r w-8">#</th>
            <th className="px-2 py-1 border-r text-left whitespace-nowrap">{header}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length===0 && (
            <tr><td colSpan={2} className="px-3 py-3 text-center text-slate-500">Нет строк</td></tr>
          )}
          {rows.map((val, i) => (
            <tr key={i} className={`${selected===i?'bg-green-50':''} hover:bg-slate-50 cursor-pointer`} onClick={()=>onSelect(i)}>
              <td className="px-2 py-1 border-r text-slate-500">{i+1}</td>
              <td className="px-1 py-1 border-r">
                <input
                  type="number"
                  value={String(val ?? 0)}
                  onChange={(e)=>setCell(i, parseFloat(e.target.value || '0'))}
                  className="w-32 border rounded px-2 py-1"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
