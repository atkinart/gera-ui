
import { create } from 'zustand'

export type MeshResult = { type: 'box'; args: [number, number, number] } | null

type State = {
  selectedProjectId: string | null
  lastJobId: string | null
  mesh: MeshResult
}

type Actions = {
  selectProject: (id: string) => void
  setJobId: (id: string | null) => void
  setMesh: (mesh: MeshResult) => void
  reset: () => void
}

const useWorkspace = create<State & Actions>((set) => ({
  selectedProjectId: null,
  lastJobId: null,
  mesh: null,
  selectProject: (id) => set({ selectedProjectId: id }),
  setJobId: (id) => set({ lastJobId: id }),
  setMesh: (mesh) => set({ mesh }),
  reset: () => set({ selectedProjectId: null, lastJobId: null, mesh: null }),
}))

export default useWorkspace
