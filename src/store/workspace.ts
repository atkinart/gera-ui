
import { create } from 'zustand'

export type MeshResult = { type: 'box'; args: [number, number, number] } | null

type State = {
  selectedProjectId: string | null
  lastJobId: string | null
  mesh: MeshResult
  isProjectsOpen: boolean
}

type Actions = {
  selectProject: (id: string) => void
  setJobId: (id: string | null) => void
  setMesh: (mesh: MeshResult) => void
  reset: () => void
  toggleProjects: () => void
}

const useWorkspace = create<State & Actions>((set) => ({
  selectedProjectId: null,
  lastJobId: null,
  mesh: null,
  isProjectsOpen: true,
  selectProject: (id) => set({ selectedProjectId: id }),
  setJobId: (id) => set({ lastJobId: id }),
  setMesh: (mesh) => set({ mesh }),
  reset: () => set({ selectedProjectId: null, lastJobId: null, mesh: null }),
  toggleProjects: () => set((s) => ({ isProjectsOpen: !s.isProjectsOpen })),
}))

export default useWorkspace
