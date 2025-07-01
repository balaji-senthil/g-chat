import React from 'react'
import {render, screen} from '@testing-library/react'
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {ProtectedRoute} from '../src/components/auth/ProtectedRoute'
import {MemoryRouter, Route, Routes} from 'react-router-dom'

// Mock the useAuthContext hook
vi.mock('../src/context/AuthContext', () => ({
  useAuthContext: vi.fn(),
}))

// Import the mock directly here instead of requiring it later
const {useAuthContext} = await import('../src/context/AuthContext')

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows loading spinner when authentication is being checked', () => {
    // Set mock return value for useAuthContext
    useAuthContext.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    })

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <ProtectedRoute />
      </MemoryRouter>,
    )

    // Should show loading spinner
    expect(screen.getByTestId('progressbar')).toBeInTheDocument()
  })

  it('allows access to protected route when user is authenticated', () => {
    // Set mock return value for useAuthContext
    useAuthContext.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    })

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    // Should render the protected content
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects to login page when user is not authenticated', () => {
    // Set mock return value for useAuthContext
    useAuthContext.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    })

    // Use a mock for Navigate since it's used in the ProtectedRoute
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom')
      return {
        ...actual,
        Navigate: () => <div>Redirected to Login</div>,
      }
    })

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <ProtectedRoute />
      </MemoryRouter>,
    )

    // Should show redirect content
    expect(screen.getByText('Redirected to Login')).toBeInTheDocument()
  })
})
