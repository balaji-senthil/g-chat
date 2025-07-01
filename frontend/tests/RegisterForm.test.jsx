import React from 'react'
import {render, screen, fireEvent, waitFor} from '@testing-library/react'
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {RegisterForm} from '../src/components/auth/RegisterForm'
import {AuthProvider} from '../src/context/AuthContext'

// Mock navigate function
const mockNavigate = vi.fn()

// Mock the AuthContext and react-router-dom
vi.mock('../src/context/AuthContext', () => ({
  AuthProvider: ({children}) => children,
  useAuthContext: vi.fn(() => ({
    register: vi.fn(),
    isLoading: false,
    error: null,
  })),
}))

// Import the mock directly here
const {useAuthContext} = await import('../src/context/AuthContext')

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders the registration form correctly', () => {
    render(<RegisterForm />)

    // Check form elements
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    // Check both password fields are present
    const passwordInputs = screen.getAllByLabelText(/password/i)
    expect(passwordInputs.length).toBe(2)
    expect(passwordInputs.find(input => input.name === 'password')).toBeInTheDocument()
    expect(passwordInputs.find(input => input.name === 'confirmPassword')).toBeInTheDocument()
    expect(screen.getByRole('button', {name: /register/i})).toBeInTheDocument()
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument()
    expect(screen.getByRole('button', {name: /login/i})).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    render(<RegisterForm />)

    // Submit form without data
    fireEvent.click(screen.getByRole('button', {name: /register/i}))

    // Check for validation messages
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('validates email format', async () => {
    render(<RegisterForm />)

    // Fill in form with invalid email
    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: {value: 'Test User'},
    })
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: {value: 'invalid-email'},
    })
    const passwordInputs = screen.getAllByLabelText(/password/i)
    const passwordInput = passwordInputs.find(input => input.name === 'password')
    const confirmPasswordInput = passwordInputs.find(input => input.name === 'confirmPassword')
    fireEvent.change(passwordInput, {
      target: {value: 'password123'},
    })
    fireEvent.change(confirmPasswordInput, {
      target: {value: 'password123'},
    })

    // Submit form
    fireEvent.click(screen.getByRole('button', {name: /register/i}))

    // Check for email validation message
    await waitFor(() => {
      expect(screen.getByText('Email address is invalid')).toBeInTheDocument()
    })
  })

  it('validates password requirements', async () => {
    render(<RegisterForm />)

    // Fill in form with short password
    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: {value: 'Test User'},
    })
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: {value: 'test@example.com'},
    })
    const passwordInputs2 = screen.getAllByLabelText(/password/i)
    const passwordInput2 = passwordInputs2.find(input => input.name === 'password')
    const confirmPasswordInput2 = passwordInputs2.find(input => input.name === 'confirmPassword')
    fireEvent.change(passwordInput2, {
      target: {value: '123'},
    })
    fireEvent.change(confirmPasswordInput2, {
      target: {value: '123'},
    })

    // Submit form
    fireEvent.click(screen.getByRole('button', {name: /register/i}))

    // Check for password validation message
    await waitFor(() => {
      expect(
        screen.getByText(/password must be at least 8 characters long/i),
      ).toBeInTheDocument()
    })
  })

  it('validates password match', async () => {
    render(<RegisterForm />)

    // Fill in form with mismatched passwords
    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: {value: 'Test User'},
    })
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: {value: 'test@example.com'},
    })
    const passwordInputs3 = screen.getAllByLabelText(/password/i)
    const passwordInput3 = passwordInputs3.find(input => input.name === 'password')
    const confirmPasswordInput3 = passwordInputs3.find(input => input.name === 'confirmPassword')
    fireEvent.change(passwordInput3, {
      target: {value: 'password123'},
    })
    fireEvent.change(confirmPasswordInput3, {
      target: {value: 'password456'},
    })

    // Submit form
    fireEvent.click(screen.getByRole('button', {name: /register/i}))

    // Check for password match validation message
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    })
  })

  it('calls register function with correct values when form is submitted', async () => {
    const mockRegister = vi.fn()

    // Use the imported mock instead of require
    useAuthContext.mockReturnValue({
      register: mockRegister,
      isLoading: false,
      error: null,
    })

    render(<RegisterForm />)

    // Fill in form
    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: {value: 'Test User'},
    })
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: {value: 'test@example.com'},
    })
    const passwordInputs4 = screen.getAllByLabelText(/password/i)
    const passwordInput4 = passwordInputs4.find(input => input.name === 'password')
    const confirmPasswordInput4 = passwordInputs4.find(input => input.name === 'confirmPassword')
    fireEvent.change(passwordInput4, {
      target: {value: 'password123'},
    })
    fireEvent.change(confirmPasswordInput4, {
      target: {value: 'password123'},
    })

    // Submit form
    fireEvent.click(screen.getByRole('button', {name: /register/i}))

    // Check if register was called with correct values
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        'Test User',
        'test@example.com',
        'password123',
      )
    })
  })

  it('displays loading state when isLoading is true', () => {
    // Use the imported mock instead of require
    useAuthContext.mockReturnValue({
      register: vi.fn(),
      isLoading: true,
      error: null,
    })

    render(<RegisterForm />)

    // The button should be disabled and show a CircularProgress
    const buttons = screen.getAllByRole('button')
    const submitButton = buttons.find(btn => btn.type === 'submit')
    expect(submitButton).toBeDisabled()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('displays error message when registration fails', () => {
    // Use the imported mock instead of require
    useAuthContext.mockReturnValue({
      register: vi.fn(),
      isLoading: false,
      error: 'Email already exists',
    })

    render(<RegisterForm />)

    expect(screen.getByText('Email already exists')).toBeInTheDocument()
  })

  it('navigates to login page when login button is clicked', () => {
    render(<RegisterForm />)

    // Click login button
    fireEvent.click(screen.getByRole('button', {name: /login/i}))

    // Check if navigate was called to redirect to login page
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})
