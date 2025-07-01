import React, {createContext, useState, useContext, useEffect} from 'react'
import * as apiService from '../services/api'
import {useNotification} from './NotificationContext'

// Create the AuthContext
const AuthContext = createContext()

export const AuthProvider = ({children}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const {showNotification} = useNotification()

  // Function to check token expiration
  const isTokenExpired = () => {
    const expiresAt = localStorage.getItem('auth_expires_at')
    if (!expiresAt) return true
    // Convert expiration time to milliseconds for comparison
    const expirationTime = parseInt(expiresAt, 10) * 1000
    return Date.now() >= expirationTime
  }

  // Function to clear authentication state and all user-specific contexts
  const clearAuthState = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_expires_at')
    setIsAuthenticated(false)
    setUser(null)

    // Clear all user-specific context data
    // Note: We'll trigger a global reset event that other contexts can listen to
    window.dispatchEvent(new CustomEvent('userLogout'))
  }

  // Function to handle forced logout (called by API service on 401 errors)
  const handleForcedLogout = () => {
    console.log('Session expired or token invalid - logging out user')
    clearAuthState()
    setError('Your session has expired. Please log in again.')
    // Show notification to user
    showNotification(
      'Your session has expired. Please log in again.',
      'warning',
      8000,
    )
  }

  // Set up the global logout callback when the provider mounts
  useEffect(() => {
    apiService.setGlobalLogoutCallback(handleForcedLogout)

    // Cleanup on unmount
    return () => {
      apiService.setGlobalLogoutCallback(null)
    }
  }, [showNotification])

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true)
      try {
        const token = localStorage.getItem('auth_token')

        if (token && !isTokenExpired()) {
          // Token exists and not expired
          const userData = await apiService.getCurrentUser()
          setUser(userData)
          setIsAuthenticated(true)
        } else if (token) {
          // Token exists but expired
          clearAuthState()
        }
      } catch (err) {
        console.error('Authentication check failed:', err)
        clearAuthState()
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  // Add periodic token expiration check
  useEffect(() => {
    if (!isAuthenticated) return

    const checkTokenExpiration = () => {
      if (isTokenExpired()) {
        console.log('Token expired during periodic check - logging out user')
        handleForcedLogout()
      }
    }

    // Check every minute
    const intervalId = setInterval(checkTokenExpiration, 60000)

    // Cleanup interval on unmount
    return () => clearInterval(intervalId)
  }, [isAuthenticated, handleForcedLogout])

  // Login function
  const login = async (email, password) => {
    setIsLoading(true)
    setError(null)

    // Explicitly clear previous user state first
    setUser(null)
    setIsAuthenticated(false)

    try {
      const response = await apiService.login(email, password)

      // Store token in localStorage
      localStorage.setItem('auth_token', response.access_token)
      localStorage.setItem('auth_expires_at', String(response.expires_at))

      // Get user data
      const userData = await apiService.getCurrentUser()
      setUser(userData)
      setIsAuthenticated(true)

      // Trigger event for other contexts to refresh user-specific data
      window.dispatchEvent(new CustomEvent('userLogin', {detail: userData}))

      return true
    } catch (err) {
      console.error('Login failed:', err)
      setError(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Register function
  const register = async (name, email, password) => {
    setIsLoading(true)
    setError(null)

    try {
      // Register the user
      await apiService.register(name, email, password)

      // Automatically log in after registration
      await login(email, password)

      return true
    } catch (err) {
      console.error('Registration failed:', err)
      setError(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Logout function
  const logout = async () => {
    setIsLoading(true)

    try {
      await apiService.logout()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      clearAuthState()
      setIsLoading(false)
    }
  }

  // Clear error function
  const clearError = () => {
    setError(null)
  }

  // Auth context value
  const value = {
    isAuthenticated,
    user,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Custom hook for using auth context
export const useAuthContext = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
