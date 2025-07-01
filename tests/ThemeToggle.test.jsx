import React from 'react'
import {render, screen, fireEvent} from '@testing-library/react'
import {describe, it, expect, vi} from 'vitest'
import ThemeToggle from '../src/components/ThemeToggle'
import {ThemeProvider, themes} from '../src/context/ThemeContext'

describe('ThemeToggle Component', () => {
  it('renders the theme toggle buttons', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    )

    // Should render three buttons for system, light, and dark themes
    const toggleButtons = screen.getAllByRole('button')
    expect(toggleButtons.length).toBe(3)
  })

  it('changes theme when a button is clicked', () => {
    // Create a mock for localStorage
    const localStorageMock = {
      getItem: vi.fn().mockReturnValue(themes.SYSTEM),
      setItem: vi.fn(),
    }

    // Save the original localStorage
    const originalLocalStorage = global.localStorage

    // Replace with our mock
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    )

    // Get all toggle buttons
    const toggleButtons = screen.getAllByRole('button')

    // Click the light theme button (second button)
    fireEvent.click(toggleButtons[1])

    // Verify localStorage was called to save the theme preference
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'themePreference',
      expect.any(String),
    )

    // Restore original localStorage
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
    })
  })

  it('applies correct aria-labels to theme buttons', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    )

    // Check that the buttons have the correct aria-labels
    expect(screen.getByLabelText('system theme')).toBeInTheDocument()
    expect(screen.getByLabelText('light theme')).toBeInTheDocument()
    expect(screen.getByLabelText('dark theme')).toBeInTheDocument()
  })
})
