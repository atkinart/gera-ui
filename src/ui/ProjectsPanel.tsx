
import { useQuery } from '@tanstack/react-query'
import { listProjects, Project } from '@/lib/api'
import useWorkspace from '@/store/workspace'

export default function ProjectsPanel() {
  const { data, isLoading } = useQuery({ queryKey: ['projects'], queryFn: listProjects })
  const selected = useWorkspace(s => s.selectedProjectId)
  const select = useWorkspace(s => s.selectProject)

  if (isLoading) return <p>Загрузка проектов...</p>
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Проекты</h3>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <button
          className="px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 text-sm"
          onClick={() => console.log('create project')}
        >
          Создать
        </button>
        <button
          className="px-3 py-1.5 rounded border hover:bg-slate-50 text-sm"
          onClick={() => console.log('import project')}
        >
          Импортировать
        </button>
        <button
          className={`px-3 py-1.5 rounded border text-sm ${selected ? 'border-red-300 text-red-700 hover:bg-red-50' : 'opacity-50 cursor-not-allowed'}`}
          disabled={!selected}
          onClick={() => selected && console.log('delete project', selected)}
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
  )
}
