import React, {createContext, useState, useEffect, useContext} from 'react'
import {ThemeProvider as MUIThemeProvider, createTheme} from '@mui/material'

// Create theme context
export const ThemeContext = createContext()

// Theme options
export const themes = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
}

// Custom hook to use the theme context - renamed to avoid conflicts
export const useAppTheme = () => useContext(ThemeContext)

export const ThemeProvider = ({children}) => {
  // Initialize theme from localStorage or default to system
  const [themePreference, setThemePreference] = useState(() => {
    const savedTheme = localStorage.getItem('themePreference')
    return savedTheme || themes.SYSTEM
  })

  // Determine if dark mode should be applied
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (themePreference === themes.DARK) return true
    if (themePreference === themes.LIGHT) return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // Listen for system theme changes if using system theme
  useEffect(() => {
    if (themePreference !== themes.SYSTEM) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = e => setIsDarkMode(e.matches)

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [themePreference])

  // Save theme preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('themePreference', themePreference)

    if (themePreference === themes.DARK) {
      setIsDarkMode(true)
    } else if (themePreference === themes.LIGHT) {
      setIsDarkMode(false)
    } else {
      setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
  }, [themePreference])

  // Create MUI theme based on dark mode state
  const theme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
    },
  })

  // Value to be provided by the context
  const value = {
    themePreference,
    setThemePreference,
    isDarkMode,
  }

  return (
    <ThemeContext.Provider value={value}>
      <MUIThemeProvider theme={theme}>{children}</MUIThemeProvider>
    </ThemeContext.Provider>
  )
}
