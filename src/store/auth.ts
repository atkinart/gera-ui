
import { create } from 'zustand'

type State = {
  token: string | null
  email: string | null
}

type Actions = {
  login: (token: string, email: string) => void
  logout: () => void
}

const useAuthStore = create<State & Actions>((set) => ({
  token: null,
  email: null,
  login: (token, email) => set({ token, email }),
  logout: () => set({ token: null, email: null }),
}))

export default useAuthStore
