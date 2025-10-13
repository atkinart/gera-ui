
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listProjects, Project, importModel, createModel, deleteModel } from '@/lib/api'
import useWorkspace from '@/store/workspace'
import { useRef, useState } from 'react'

export default function ProjectsPanel() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['projects'], queryFn: listProjects })
  const selected = useWorkspace(s => s.selectedProjectId)
  const select = useWorkspace(s => s.selectProject)
  const deselect = useWorkspace(s => s.deselectProject)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isImportOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importName, setImportName] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [isCreateOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [isDeleteOpen, setDeleteOpen] = useState(false)

  const openFileDialog = () => fileInputRef.current?.click()
  const onFileChosen: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setImportFile(f)
    const base = f.name.replace(/\.[^.]+$/, '')
    setImportName(base)
    setImportOpen(true)
    // сбросим значение, чтобы повторный выбор того же файла сработал
    e.currentTarget.value = ''
  }

  const closeImport = () => {
    setImportOpen(false)
    setImportFile(null)
    setImportName('')
  }

  const doImport = async () => {
    try {
      const name = (importName || importFile?.name.replace(/\.[^.]+$/, '') || '').trim()
      const filename = importFile?.name
      await importModel({ name, filename })
      closeImport()
      await qc.invalidateQueries({ queryKey: ['projects'] })
      setToast('Импорт успешно выполнен')
      setTimeout(() => setToast(null), 2500)
    } catch (e: any) {
      // По требованию: закрывать модалку при ошибке и показать текст ошибки мока
      closeImport()
      const message = e?.response?.data?.error || 'модель не прошла провеку'
      setToast(message)
      setTimeout(() => setToast(null), 3000)
    }
  }

  const openCreate = () => {
    setCreateOpen(true)
    setCreateName('')
  }

  const closeCreate = () => {
    setCreateOpen(false)
    setCreateName('')
  }

  const doCreate = async () => {
    try {
      const name = createName.trim()
      if (!name) return
      await createModel({ name })
      closeCreate()
      await qc.invalidateQueries({ queryKey: ['projects'] })
      setToast('Модель создана')
      setTimeout(() => setToast(null), 2500)
    } catch (e: any) {
      const message = e?.response?.data?.error || 'Не удалось создать модель'
      closeCreate()
      setToast(message)
      setTimeout(() => setToast(null), 3000)
    }
  }

  const openDelete = () => {
    if (!selected) return
    setDeleteOpen(true)
  }

  const closeDelete = () => setDeleteOpen(false)

  const doDelete = async () => {
    if (!selected) return
    try {
      await deleteModel(selected)
      closeDelete()
      deselect()
      await qc.invalidateQueries({ queryKey: ['projects'] })
      setToast('Модель удалена')
      setTimeout(() => setToast(null), 2500)
    } catch (e: any) {
      closeDelete()
      const message = e?.response?.data?.error || 'Не удалось удалить модель'
      setToast(message)
      setTimeout(() => setToast(null), 3000)
    }
  }

  if (isLoading) return <p>Загрузка проектов...</p>
  return (
    <>
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Модели</h3>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <button
          className="px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 text-sm"
          onClick={openCreate}
        >
          Создать
        </button>
        <button
          className="px-3 py-1.5 rounded border hover:bg-slate-50 text-sm"
          onClick={openFileDialog}
        >
          Импортировать
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".dan,.DAN"
          className="hidden"
          onChange={onFileChosen}
        />
        <button
          className={`px-3 py-1.5 rounded border text-sm ${selected ? 'border-red-300 text-red-700 hover:bg-red-50' : 'opacity-50 cursor-not-allowed'}`}
          disabled={!selected}
          onClick={openDelete}
        >
          Удалить
        </button>
      </div>
      <ul className="space-y-2">
        {data?.map((p: Project) => (
          <li key={p.id}>
            <button onClick={()=>select(p.id)} className={`w-full text-left px-3 py-2 rounded border ${selected===p.id?'bg-green-50 border-green-300':'border-slate-200'}`}>
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-slate-500">{new Date(p.createdAt).toLocaleString()}</div>
            </button>
          </li>
        ))}
      </ul>
    </div>
    {isImportOpen && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-[520px] max-w-[92vw] p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl" aria-hidden>📄</span>
            <div className="truncate" title={importFile?.name}>{importFile?.name}</div>
          </div>
          <label className="block text-sm mb-1">Название модели</label>
          <input
            value={importName}
            onChange={e=>setImportName(e.target.value)}
            placeholder="Введите название или оставьте пустым"
            className="w-full border rounded px-3 py-2 mb-4 focus:outline-none focus:ring focus:ring-green-200"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={closeImport}
              className="px-3 py-1.5 rounded border hover:bg-slate-50"
            >
              Отмена
            </button>
            <button
              onClick={doImport}
              className="px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700"
            >
              Импорт
            </button>
          </div>
        </div>
      </div>
    )}
    {isCreateOpen && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-[520px] max-w-[92vw] p-5">
          <h4 className="font-semibold mb-3">Создать модель</h4>
          <label className="block text-sm mb-1">Название модели</label>
          <input
            value={createName}
            onChange={e=>setCreateName(e.target.value)}
            placeholder="Например: Демонстрационная модель"
            className="w-full border rounded px-3 py-2 mb-4 focus:outline-none focus:ring focus:ring-green-200"
          />
          <div className="flex items-center justify-end gap-2">
            <button onClick={closeCreate} className="px-3 py-1.5 rounded border hover:bg-slate-50">Отмена</button>
            <button
              onClick={doCreate}
              disabled={!createName.trim()}
              className={`px-3 py-1.5 rounded text-white ${createName.trim() ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-300 cursor-not-allowed'}`}
            >
              Создать
            </button>
          </div>
        </div>
      </div>
    )}
    {isDeleteOpen && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-[520px] max-w-[92vw] p-5">
          <h4 className="font-semibold mb-3">Удаление модели</h4>
          <p className="mb-4">
            Точно хотите удалить модель
            {" "}
            <span className="font-semibold">
              {data?.find(p => p.id === selected)?.name ?? ''}
            </span>
            ?
          </p>
          <div className="flex items-center justify-end gap-2">
            <button onClick={closeDelete} className="px-3 py-1.5 rounded border hover:bg-slate-50">Отмена</button>
            <button onClick={doDelete} className="px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700">Да</button>
          </div>
        </div>
      </div>
    )}
    {toast && (
      <div className="fixed bottom-4 right-4 bg-white border border-slate-200 shadow-lg rounded px-4 py-2 z-50">
        {toast}
      </div>
    )}
    </>
  )
}
