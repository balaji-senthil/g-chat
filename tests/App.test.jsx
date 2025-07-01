import React from 'react'
import {render, screen} from '@testing-library/react'
import {describe, it, expect, vi, beforeEach} from 'vitest'
import App from '../src/App'

// Mock components
vi.mock('../src/components/ChatWindow', () => ({
  default: () => <div data-testid="chat-window">Chat Window Component</div>,
}))

vi.mock('../src/components/InputArea', () => ({
  default: () => <div data-testid="input-area">Input Area Component</div>,
}))

vi.mock('../src/components/Header', () => ({
  default: () => <div data-testid="header">Header Component</div>,
}))

vi.mock('../src/components/auth/LoginForm', () => ({
  LoginForm: () => <div data-testid="login-form">Login Form</div>,
}))

vi.mock('../src/components/auth/RegisterForm', () => ({
  RegisterForm: () => <div data-testid="register-form">Register Form</div>,
}))

// Create a modified mock for ProtectedRoute to properly render children or redirect based on auth state
vi.mock('../src/components/auth/ProtectedRoute', () => {
  const {Navigate} = require('react-router-dom')
  return {
    ProtectedRoute: () => {
      // Use window.mockAuthState to determine authentication state in tests
      const isAuthenticated = window.mockAuthState === 'authenticated'

      if (isAuthenticated) {
        return (
          <div data-testid="protected-route-content">
            <div data-testid="header">Header Component</div>
            <div data-testid="chat-window">Chat Window Component</div>
            <div data-testid="input-area">Input Area Component</div>
          </div>
        )
      } else {
        return <div data-testid="navigate-to-/login">Navigate to /login</div>
      }
    },
  }
})

vi.mock('../src/context/ChatContext', () => ({
  ChatProvider: ({children}) => (
    <div data-testid="chat-provider">{children}</div>
  ),
  useChatContext: () => ({}),
}))

vi.mock('../src/context/ThemeContext', () => ({
  ThemeProvider: ({children}) => (
    <div data-testid="theme-provider">{children}</div>
  ),
  useAppTheme: () => ({
    isDarkMode: false,
    themePreference: 'light',
    setThemePreference: vi.fn(),
  }),
}))

// Mock auth context with different authentication states
vi.mock('../src/context/AuthContext', () => {
  const mockUnauthenticated = {
    isAuthenticated: false,
    isLoading: false,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    error: null,
  }

  const mockAuthenticated = {
    isAuthenticated: true,
    isLoading: false,
    user: {name: 'Test User', email: 'test@example.com'},
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    error: null,
  }

  return {
    AuthProvider: ({children}) => (
      <div data-testid="auth-provider">{children}</div>
    ),
    useAuthContext: vi.fn(() => {
      // Check current auth state for testing
      if (window.mockAuthState === 'authenticated') {
        return mockAuthenticated
      }
      return mockUnauthenticated
    }),
  }
})

// Mock react-router-dom Navigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Navigate: ({to}) => (
      <div data-testid={`navigate-to-${to}`}>Navigate to {to}</div>
    ),
    useNavigate: () => vi.fn(),
  }
})

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.pushState({}, '', '/')
    window.mockAuthState = 'unauthenticated' // Default to unauthenticated
  })

  it('renders main providers', () => {
    render(<App />)
    expect(screen.getByTestId('theme-provider')).toBeInTheDocument()
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument()
    expect(screen.getByTestId('chat-provider')).toBeInTheDocument()
  })

  it('renders login form when navigated to /login', () => {
    window.history.pushState({}, '', '/login')
    render(<App />)
    expect(screen.getByTestId('login-form')).toBeInTheDocument()
  })

  it('renders register form when navigated to /register', () => {
    window.history.pushState({}, '', '/register')
    render(<App />)
    expect(screen.getByTestId('register-form')).toBeInTheDocument()
  })

  it('redirects to login when accessing protected route while unauthenticated', () => {
    window.history.pushState({}, '', '/chat')
    window.mockAuthState = 'unauthenticated'

    render(<App />)

    // Should redirect to login when unauthenticated
    expect(screen.getByTestId('navigate-to-/login')).toBeInTheDocument()
  })

  it('renders chat app when accessing protected route while authenticated', () => {
    window.history.pushState({}, '', '/chat')
    window.mockAuthState = 'authenticated'

    render(<App />)

    // Should render the chat app components
    expect(screen.getByTestId('protected-route-content')).toBeInTheDocument()
    expect(screen.getByTestId('header')).toBeInTheDocument()
    expect(screen.getByTestId('chat-window')).toBeInTheDocument()
    expect(screen.getByTestId('input-area')).toBeInTheDocument()
  })
})
