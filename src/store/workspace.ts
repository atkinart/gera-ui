
import { create } from 'zustand'

export type MeshResult = { type: 'box'; args: [number, number, number] } | null

type State = {
  selectedProjectId: string | null
  lastJobId: string | null
  mesh: MeshResult
  isProjectsOpen: boolean
  isViewerOpen: boolean
}

type Actions = {
  selectProject: (id: string) => void
  deselectProject: () => void
  setJobId: (id: string | null) => void
  setMesh: (mesh: MeshResult) => void
  reset: () => void
  toggleProjects: () => void
  setProjectsOpen: (open: boolean) => void
  toggleViewer: () => void
  setViewerOpen: (open: boolean) => void
}

const useWorkspace = create<State & Actions>((set) => ({
  selectedProjectId: null,
  lastJobId: null,
  mesh: null,
  isProjectsOpen: true,
  isViewerOpen: true,
  selectProject: (id) => set({ selectedProjectId: id }),
  deselectProject: () => set({ selectedProjectId: null }),
  setJobId: (id) => set({ lastJobId: id }),
  setMesh: (mesh) => set({ mesh }),
  reset: () => set({ selectedProjectId: null, lastJobId: null, mesh: null }),
  toggleProjects: () => set((s) => ({ isProjectsOpen: !s.isProjectsOpen })),
  setProjectsOpen: (open) => set({ isProjectsOpen: open }),
  toggleViewer: () => set((s) => ({ isViewerOpen: !s.isViewerOpen })),
  setViewerOpen: (open) => set({ isViewerOpen: open }),
}))

export default useWorkspace
