
import ProjectsPanel from '@/ui/ProjectsPanel'
import ConfigPanel from '@/ui/ConfigPanel'
import Viewer3D from '@/ui/Viewer3D'

export default function Workspace() {
  return (
    <div className="h-[calc(100vh-56px)] grid grid-cols-12 gap-3 container-lg py-3">
      <aside className="card p-3 col-span-3 overflow-auto">
        <ProjectsPanel />
      </aside>
      <section className="card p-3 col-span-4 overflow-auto">
        <ConfigPanel />
      </section>
      <section className="card p-0 col-span-5 overflow-hidden">
        <Viewer3D />
      </section>
    </div>
  )
}
