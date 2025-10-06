
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
      <h3 className="font-semibold mb-2">Проекты</h3>
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
