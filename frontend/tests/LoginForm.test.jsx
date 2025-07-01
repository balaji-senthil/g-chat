import React from 'react'
import {render, screen, fireEvent, waitFor} from '@testing-library/react'
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {LoginForm} from '../src/components/auth/LoginForm'
import {AuthProvider} from '../src/context/AuthContext'

// Mock navigate function
const mockNavigate = vi.fn()

// Mock the AuthContext and react-router-dom
vi.mock('../src/context/AuthContext', () => ({
  AuthProvider: ({children}) => children,
  useAuthContext: vi.fn(() => ({
    login: vi.fn(),
    isLoading: false,
    error: null,
  })),
}))

// Import the mock directly here
const {useAuthContext} = await import('../src/context/AuthContext')

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

describe('LoginForm', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders the login form correctly', () => {
    render(<LoginForm />)

    // Check form elements
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', {name: /^login$/i})).toBeInTheDocument()
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument()
    expect(screen.getByRole('button', {name: /register/i})).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    render(<LoginForm />)

    // Submit form without data
    fireEvent.click(screen.getByRole('button', {name: /^login$/i}))

    // Check for validation messages
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('validates email format', async () => {
    render(<LoginForm />)

    // Enter invalid email
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: {value: 'invalid-email'},
    })

    // Enter password
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: {value: 'password123'},
    })

    // Submit form
    fireEvent.click(screen.getByRole('button', {name: /^login$/i}))

    // Check for email validation message
    await waitFor(() => {
      expect(screen.getByText(/email address is invalid/i)).toBeInTheDocument()
    })
  })

  it('calls login function with correct values when form is submitted', async () => {
    const mockLogin = vi.fn()

    // Use the imported mock instead of require
    useAuthContext.mockReturnValue({
      login: mockLogin,
      isLoading: false,
      error: null,
    })

    render(<LoginForm />)

    // Fill in form
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: {value: 'test@example.com'},
    })

    fireEvent.change(screen.getByLabelText(/password/i), {
      target: {value: 'password123'},
    })

    // Submit form
    fireEvent.click(screen.getByRole('button', {name: /^login$/i}))

    // Check if login was called with correct values
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })

  it('displays loading state when isLoading is true', () => {
    // Use the imported mock instead of require
    useAuthContext.mockReturnValue({
      login: vi.fn(),
      isLoading: true,
      error: null,
    })

    render(<LoginForm />)

    // The button should be disabled and show a CircularProgress
    const buttons = screen.getAllByRole('button')
    const submitButton = buttons.find(btn => btn.type === 'submit')
    expect(submitButton).toBeDisabled()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('displays error message when authentication fails', () => {
    // Use the imported mock instead of require
    useAuthContext.mockReturnValue({
      login: vi.fn(),
      isLoading: false,
      error: 'Invalid credentials',
    })

    render(<LoginForm />)

    expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
  })

  it('navigates to register page when register button is clicked', () => {
    render(<LoginForm />)

    // Click register button
    fireEvent.click(screen.getByRole('button', {name: /register/i}))

    // Check if navigate was called to redirect to register page
    expect(mockNavigate).toHaveBeenCalledWith('/register')
  })
})
