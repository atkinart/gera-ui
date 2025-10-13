
import { Route, Routes, Navigate, Link, useNavigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import RegisterPage from './pages/RegisterPage'
import LoginPage from './pages/LoginPage'
import Workspace from './pages/Workspace'
import useAuthStore from './store/auth'
import useWorkspace from './store/workspace'

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const isAuthed = useAuthStore(s => !!s.token)
  return isAuthed ? children : <Navigate to="/login" replace />
}

export default function App() {
  const navigate = useNavigate()
  const { setProjectsOpen } = useWorkspace()
  return (
    <div className="min-h-screen text-slate-800">
      <header className="border-b bg-white">
        <div className="container-lg flex items-center justify-between py-3">
          <Link to="/" className="font-semibold">Gera Modern</Link>
          <nav className="flex items-center gap-4">
            <button
              onClick={() => { setProjectsOpen(true); navigate('/app') }}
              className="px-3 py-1.5 rounded border text-sm hover:bg-slate-50"
            >
              Панель моделей
            </button>
            <Link to="/register" className="text-sm hover:underline">Регистрация</Link>
            <Link to="/login" className="text-sm hover:underline">Вход</Link>
          </nav>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/app" element={<ProtectedRoute><Workspace /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  )
}
