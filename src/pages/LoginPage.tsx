
import { FormEvent, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { loginUser } from '@/lib/api'
import useAuthStore from '@/store/auth'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const doLogin = useAuthStore(s => s.login)
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: () => loginUser({ login, password }),
    onSuccess: (data) => {
      doLogin(data.token, data.email)
      navigate('/app')
    }
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <div className="container-lg py-12 max-w-xl">
      <h2 className="text-2xl font-semibold mb-6">Вход</h2>
      <form onSubmit={onSubmit} className="card p-6 space-y-4">
        <label className="block">
          <span className="text-sm">Логин</span>
          <input value={login} onChange={(e)=>setLogin(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" required />
        </label>
        <label className="block">
          <span className="text-sm">Пароль</span>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" required />
        </label>
        <button disabled={mutation.isPending} className="brand-btn">
          {mutation.isPending ? 'Входим...' : 'Войти'}
        </button>
        {mutation.isError && <p className="text-red-700">Ошибка аутентификации</p>}
      </form>
    </div>
  )
}
