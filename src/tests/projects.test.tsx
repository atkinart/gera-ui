
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ProjectsPanel from '@/ui/ProjectsPanel'

test('renders projects from backend', async () => {
  const qc = new QueryClient()
  render(
    <QueryClientProvider client={qc}>
      <ProjectsPanel />
    </QueryClientProvider>
  )
  await waitFor(async () => {
    expect(await screen.findByText('Проект 1')).toBeInTheDocument()
    expect(await screen.findByText('Проект 2')).toBeInTheDocument()
  })
})
