
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '@/pages/LoginPage'
import useAuthStore from '@/store/auth'

function wrapper(children: React.ReactNode) {
  const qc = new QueryClient()
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  )
}

test('login calls backend and stores token', async () => {
  render(wrapper(<LoginPage />))
  fireEvent.change(screen.getByLabelText('Логин'), { target: { value: 'demo' } })
  fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'pass' } })
  fireEvent.click(screen.getByRole('button', { name: /Войти|Входим/i }))

  await waitFor(() => {
    const state = useAuthStore.getState()
    expect(state.token).toBe('dev-token')
  })
})
