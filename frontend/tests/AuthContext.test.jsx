import React from 'react'
import {render, screen, act, waitFor, fireEvent} from '@testing-library/react'
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {AuthProvider, useAuthContext} from '../src/context/AuthContext'
import * as apiService from '../src/services/apiService'

// Mock the apiService
vi.mock('../src/services/apiService', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getCurrentUser: vi.fn(),
  logout: vi.fn(() => {
    // Ensure localStorage items are removed
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_expires_at')
  }),
  config: {
    API_URL: 'http://test-api.com/api',
  },
}))

// Test component that uses the auth context
const TestComponent = () => {
  const {user, isAuthenticated, isLoading, error, login, register, logout} =
    useAuthContext()

  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? 'Authenticated' : 'Not authenticated'}
      </div>
      <div data-testid="loading-status">
        {isLoading ? 'Loading' : 'Not loading'}
      </div>
      <div data-testid="error-message">{error || 'No error'}</div>
      <div data-testid="user-info">
        {user ? JSON.stringify(user) : 'No user'}
      </div>
      <button
        data-testid="login-button"
        onClick={() => login('test@example.com', 'password')}
      >
        Login
      </button>
      <button
        data-testid="register-button"
        onClick={() => register('Test User', 'test@example.com', 'password')}
      >
        Register
      </button>
      <button data-testid="logout-button" onClick={logout}>
        Logout
      </button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks()
    // Clear localStorage
    localStorage.clear()
  })

  afterEach(() => {
    // Clear localStorage after each test
    localStorage.clear()
  })

  it('provides initial authentication state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )

    expect(screen.getByTestId('auth-status').textContent).toBe(
      'Not authenticated',
    )
    expect(screen.getByTestId('loading-status').textContent).toBe('Not loading')
    expect(screen.getByTestId('error-message').textContent).toBe('No error')
    expect(screen.getByTestId('user-info').textContent).toBe('No user')
  })

  it('authenticates user on successful login', async () => {
    const mockUser = {
      user_id: '123',
      email: 'test@example.com',
      name: 'Test User',
    }

    // Mock login and getCurrentUser to simulate successful login
    apiService.login.mockImplementation(() => {
      localStorage.setItem('auth_token', 'fake-token')
      localStorage.setItem('auth_expires_at', String(Date.now() + 3600000)) // 1 hour in future
      return Promise.resolve({
        access_token: 'fake-token',
        token_type: 'bearer',
        expires_at: Date.now() + 3600000,
      })
    })

    apiService.getCurrentUser.mockResolvedValueOnce(mockUser)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )

    // Click login button
    await act(async () => {
      fireEvent.click(screen.getByTestId('login-button'))
    })

    // Wait for state updates
    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe(
        'Authenticated',
      )
    })

    expect(screen.getByTestId('loading-status').textContent).toBe('Not loading')
    expect(screen.getByTestId('user-info').textContent).toContain(
      'test@example.com',
    )

    // Verify API was called correctly
    expect(apiService.login).toHaveBeenCalledWith(
      'test@example.com',
      'password',
    )
    expect(apiService.getCurrentUser).toHaveBeenCalled()
  })

  it('handles login error', async () => {
    apiService.login.mockRejectedValueOnce(new Error('Invalid credentials'))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )

    // Click login button
    await act(async () => {
      fireEvent.click(screen.getByTestId('login-button'))
    })

    // Wait for state updates
    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe(
        'Not authenticated',
      )
      expect(screen.getByTestId('loading-status').textContent).toBe(
        'Not loading',
      )
      expect(screen.getByTestId('error-message').textContent).toBe(
        'Invalid credentials',
      )
    })
  })

  it('registers a new user successfully', async () => {
    const mockUser = {
      user_id: '123',
      email: 'test@example.com',
      name: 'Test User',
    }

    apiService.register.mockResolvedValueOnce(mockUser)

    // Mock login called after registration
    apiService.login.mockImplementation(() => {
      localStorage.setItem('auth_token', 'fake-token')
      localStorage.setItem('auth_expires_at', String(Date.now() + 3600000))
      return Promise.resolve({
        access_token: 'fake-token',
        token_type: 'bearer',
        expires_at: Date.now() + 3600000,
      })
    })

    apiService.getCurrentUser.mockResolvedValueOnce(mockUser)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )

    // Click register button
    await act(async () => {
      fireEvent.click(screen.getByTestId('register-button'))
    })

    // Wait for state updates
    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe(
        'Authenticated',
      )
    })

    expect(screen.getByTestId('user-info').textContent).toContain(
      'test@example.com',
    )

    // Verify API calls
    expect(apiService.register).toHaveBeenCalledWith(
      'Test User',
      'test@example.com',
      'password',
    )
    expect(apiService.login).toHaveBeenCalled()
  })

  it('handles registration error', async () => {
    apiService.register.mockRejectedValueOnce(new Error('Email already exists'))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )

    // Click register button
    await act(async () => {
      fireEvent.click(screen.getByTestId('register-button'))
    })

    // Wait for state updates
    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe(
        'Not authenticated',
      )
      expect(screen.getByTestId('loading-status').textContent).toBe(
        'Not loading',
      )
      expect(screen.getByTestId('error-message').textContent).toBe(
        'Email already exists',
      )
    })
  })

  it('logs out the user', async () => {
    // Setup authenticated state first
    localStorage.setItem('auth_token', 'fake-token')
    localStorage.setItem('auth_expires_at', String(Date.now() + 3600000))

    const mockUser = {
      user_id: '123',
      email: 'test@example.com',
      name: 'Test User',
    }

    apiService.getCurrentUser.mockResolvedValueOnce(mockUser)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )

    // Wait for initial auth check
    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe(
        'Authenticated',
      )
    })

    // Click logout button
    await act(async () => {
      fireEvent.click(screen.getByTestId('logout-button'))
    })

    // Verify logout happened
    expect(screen.getByTestId('auth-status').textContent).toBe(
      'Not authenticated',
    )
    expect(screen.getByTestId('user-info').textContent).toBe('No user')
    expect(localStorage.getItem('auth_token')).toBeNull()
  })

  it('restores authentication from localStorage on mount', async () => {
    // Setup token in localStorage
    localStorage.setItem('auth_token', 'fake-token')
    localStorage.setItem('auth_expires_at', String(Date.now() + 3600000))

    const mockUser = {
      user_id: '123',
      email: 'test@example.com',
      name: 'Test User',
    }

    apiService.getCurrentUser.mockResolvedValueOnce(mockUser)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )

    // Wait for user info to be loaded
    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe(
        'Authenticated',
      )
      expect(screen.getByTestId('user-info').textContent).toContain(
        'test@example.com',
      )
    })

    // Verify API was called
    expect(apiService.getCurrentUser).toHaveBeenCalled()
  })

  it('handles expired token by logging out', async () => {
    // Setup expired token in localStorage
    localStorage.setItem('auth_token', 'fake-token')
    localStorage.setItem('auth_expires_at', String(Date.now() - 1000)) // Expired

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )

    // Should be logged out due to expired token
    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe(
        'Not authenticated',
      )
      expect(screen.getByTestId('user-info').textContent).toBe('No user')
      expect(localStorage.getItem('auth_token')).toBeNull()
    })
  })
})
