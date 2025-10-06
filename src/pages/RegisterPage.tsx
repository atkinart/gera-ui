
import { FormEvent, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { registerUser } from '@/lib/api'
import useAuthStore from '@/store/auth'

export default function RegisterPage() {
  const [login, setLogin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mismatch, setMismatch] = useState(false)
  const doLogin = useAuthStore(s => s.login)
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: () => registerUser({ login, email, password }),
    onSuccess: () => {
      doLogin('registered-token', email)
      navigate('/app')
    }
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    mutation.mutate()
  }

  return (
    <div className="container-lg py-12 max-w-xl">
      <h2 className="text-2xl font-semibold mb-6">Регистрация</h2>
      <form onSubmit={onSubmit} className="card p-6 space-y-4">
        <label className="block">
          <span className="text-sm">Логин</span>
          <input value={login} onChange={(e)=>setLogin(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" required />
        </label>
        <label className="block">
          <span className="text-sm">Email</span>
          <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" required />
        </label>
        <label className="block">
          <span className="text-sm">Пароль</span>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" required minLength={6} />
        </label>
        <label className="block">
          <span className="text-sm">Подтверждение пароля</span>
          <input type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" required minLength={6} />
        </label>
        <button disabled={mutation.isPending} className="brand-btn">
          {mutation.isPending ? 'Отправка...' : 'Создать аккаунт'}
        </button>
        {mismatch && <p className="text-red-700">Пароли не совпадают</p>}
        {mutation.isError && <p className="text-red-700">Ошибка регистрации</p>}
      </form>
    </div>
  )
}
