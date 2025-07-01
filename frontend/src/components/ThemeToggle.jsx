import React from 'react'
import {ToggleButton, ToggleButtonGroup, Box, Tooltip} from '@mui/material'
import {LightMode, DarkMode, SettingsBrightness} from '@mui/icons-material'
import {useAppTheme, themes} from '../context/ThemeContext'

/**
 * ThemeButton - Individual theme selection button
 */
const ThemeButton = ({value, label, icon}) => (
  <Tooltip title={`${label} theme`}>
    <ToggleButton
      value={value}
      aria-label={`${label.toLowerCase()} theme`}
      id={`theme-button-${label.toLowerCase()}`}
      data-testid={`theme-button-${label.toLowerCase()}`}
    >
      {icon}
    </ToggleButton>
  </Tooltip>
)

/**
 * ThemeToggle component - Controls for switching between light, dark, and system themes
 */
const ThemeToggle = () => {
  const {themePreference, setThemePreference} = useAppTheme()

  const handleThemeChange = (event, newTheme) => {
    // Prevent deselection (null value when clicking the same button)
    if (newTheme !== null) {
      setThemePreference(newTheme)
    }
  }

  return (
    <Box
      sx={{ml: 'auto'}}
      id="theme-toggle-container"
      data-testid="theme-toggle-container"
    >
      <ToggleButtonGroup
        value={themePreference}
        exclusive
        onChange={handleThemeChange}
        aria-label="theme toggle"
        size="small"
        id="theme-toggle-group"
        data-testid="theme-toggle-group"
      >
        <ThemeButton
          value={themes.SYSTEM}
          label="System"
          icon={<SettingsBrightness fontSize="small" />}
        />
        <ThemeButton
          value={themes.LIGHT}
          label="Light"
          icon={<LightMode fontSize="small" />}
        />
        <ThemeButton
          value={themes.DARK}
          label="Dark"
          icon={<DarkMode fontSize="small" />}
        />
      </ToggleButtonGroup>
    </Box>
  )
}

export default ThemeToggle
