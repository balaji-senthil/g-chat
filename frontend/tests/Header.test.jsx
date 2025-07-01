import React from 'react'
import {render, screen, fireEvent} from '@testing-library/react'
import {describe, it, expect, vi, beforeEach} from 'vitest'
import Header from '../src/components/Header'
import {ThemeContext} from '../src/context/ThemeContext'
import {MemoryRouter} from 'react-router-dom'

// Create a mock AuthContext for testing
const AuthContext = React.createContext(null)

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock the useAuthContext hook
vi.mock('../src/context/AuthContext', () => ({
  useAuthContext: vi.fn(),
  AuthProvider: ({children}) => children,
}))

// Import the mock directly here instead of requiring it later
const {useAuthContext} = await import('../src/context/AuthContext')

describe('Header', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  const renderWithProviders = (
    themeContextValue = {
      themePreference: 'light',
      setThemePreference: vi.fn(),
      isDarkMode: false,
    },
    authContextValue = {
      isAuthenticated: false,
      user: null,
      logout: vi.fn(),
    },
  ) => {
    // Set the mock return value for the useAuthContext hook
    useAuthContext.mockReturnValue(authContextValue)

    return render(
      <MemoryRouter>
        <ThemeContext.Provider value={themeContextValue}>
          <Header />
        </ThemeContext.Provider>
      </MemoryRouter>,
    )
  }

  it('renders the app title correctly', () => {
    renderWithProviders()
    expect(screen.getByTestId('app-title')).toHaveTextContent('AI Chat App')
  })

  it('does not show user avatar when not authenticated', () => {
    renderWithProviders()
    expect(screen.queryByTestId('user-avatar')).not.toBeInTheDocument()
  })

  it('shows user avatar when authenticated', () => {
    renderWithProviders(
      {
        themePreference: 'light',
        setThemePreference: vi.fn(),
        isDarkMode: false,
      },
      {
        isAuthenticated: true,
        user: {
          name: 'Test User',
          email: 'test@example.com',
        },
        logout: vi.fn(),
      },
    )
    expect(screen.getByTestId('user-avatar')).toBeInTheDocument()
  })

  it('displays user info and calls logout when clicking logout', () => {
    const mockLogout = vi.fn()

    renderWithProviders(
      {
        themePreference: 'light',
        setThemePreference: vi.fn(),
        isDarkMode: false,
      },
      {
        isAuthenticated: true,
        user: {
          name: 'Test User',
          email: 'test@example.com',
        },
        logout: mockLogout,
      },
    )

    // Click on the user avatar to open the menu
    fireEvent.click(screen.getByTestId('user-avatar'))

    // Check if user info is displayed
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()

    // Click logout button
    fireEvent.click(screen.getByTestId('logout-button'))

    // Verify logout was called and navigate was called
    expect(mockLogout).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})
