
import ProjectsPanel from '@/ui/ProjectsPanel'
import ConfigPanel from '@/ui/ConfigPanel'
import Viewer3D from '@/ui/Viewer3D'
import useWorkspace from '@/store/workspace'

export default function Workspace() {
  const { isProjectsOpen, toggleProjects, isViewerOpen, toggleViewer } = useWorkspace()
  const projectsCol = isProjectsOpen ? 3 : 0
  const viewerCol = isViewerOpen ? (isProjectsOpen ? 5 : 8) : 0
  const configCol = isViewerOpen ? 4 : (isProjectsOpen ? 9 : 12)
  return (
    <div className="h-[calc(100vh-56px)] w-full py-3 px-3">
      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={toggleProjects}
          className="px-3 py-1.5 rounded border text-sm hover:bg-slate-50"
        >
          {isProjectsOpen ? 'Скрыть модели' : 'Показать модели'}
        </button>
        <button
          onClick={toggleViewer}
          className="px-3 py-1.5 rounded border text-sm hover:bg-slate-50"
        >
          {isViewerOpen ? 'Скрыть 3D' : 'Показать 3D'}
        </button>
      </div>

      <div className="grid grid-cols-12 gap-3 h-[calc(100%-40px)]">
        {isProjectsOpen && (
          <aside className="card p-3 col-span-3 overflow-auto h-full">
            <ProjectsPanel />
          </aside>
        )}

        <section className={`card p-3 overflow-auto h-full col-span-${configCol}`}>
          <ConfigPanel />
        </section>

        {isViewerOpen && (
          <section className={`card p-0 overflow-hidden h-full ${isProjectsOpen ? 'col-span-5' : 'col-span-8'}`}>
            <Viewer3D />
          </section>
        )}
      </div>
    </div>
  )
}
