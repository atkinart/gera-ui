
import '@testing-library/jest-dom/vitest'
import { server } from './src/mocks/testServer'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
