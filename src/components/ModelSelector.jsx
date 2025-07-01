import React, {useState, useEffect} from 'react'
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  Chip,
  Stack,
  Fade,
  useTheme,
} from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import CheckIcon from '@mui/icons-material/Check'
import {config} from '../services/api'
import {ModelSelectorSkeleton} from './SkeletonLoader'

/**
 * ModelSelectorItem - Individual model item component
 */
const ModelSelectorItem = ({
  modelId,
  modelInfo,
  isSelected,
  onClick,
  isDarkMode,
}) => (
  <MenuItem
    onClick={() => onClick(modelId)}
    sx={{
      px: 2,
      py: 1.5,
      minHeight: 'auto',
      borderRadius: 1,
      mx: 0.5,
      mb: 0.5,
      backgroundColor: isSelected
        ? isDarkMode
          ? 'rgba(144, 202, 249, 0.08)'
          : 'rgba(25, 118, 210, 0.04)'
        : 'transparent',
      border: isSelected
        ? `1px solid ${
            isDarkMode ? 'rgba(144, 202, 249, 0.3)' : 'rgba(25, 118, 210, 0.2)'
          }`
        : '1px solid transparent',
      '&:hover': {
        backgroundColor: isDarkMode
          ? 'rgba(255, 255, 255, 0.05)'
          : 'rgba(0, 0, 0, 0.04)',
      },
      transition: 'all 0.2s ease',
    }}
  >
    <Stack direction="row" spacing={2} alignItems="center" sx={{width: '100%'}}>
      <Box sx={{flex: 1}}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: isSelected ? 600 : 500,
            color: isSelected
              ? isDarkMode
                ? '#90caf9'
                : '#1976d2'
              : 'inherit',
            mb: 0.5,
          }}
        >
          {modelInfo.name}
        </Typography>
        {modelInfo.description && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.75rem',
              lineHeight: 1.2,
            }}
          >
            {modelInfo.description}
          </Typography>
        )}
      </Box>
      {isSelected && (
        <CheckIcon
          sx={{
            color: isDarkMode ? '#90caf9' : '#1976d2',
            fontSize: 18,
          }}
        />
      )}
    </Stack>
  </MenuItem>
)

/**
 * Model selector component with Cursor-like sleek UI
 * @param {Object} props - Component props
 * @param {string} props.currentModel - Currently selected model
 * @param {function} props.onModelChange - Callback when model is changed
 * @returns {JSX.Element}
 */
function ModelSelector({currentModel, onModelChange}) {
  const [models, setModels] = useState({})
  const [loading, setLoading] = useState(true)
  const [anchorEl, setAnchorEl] = useState(null)
  const theme = useTheme()
  const isDarkMode = theme.palette.mode === 'dark'

  const open = Boolean(anchorEl)

  useEffect(() => {
    // Fetch available models from the API
    const fetchModels = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${config.API_URL}/models`)

        if (!response.ok) {
          console.error('API Response:', {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
          })
          throw new Error(
            `Failed to fetch models: ${response.status} ${response.statusText}`,
          )
        }

        const availableModels = await response.json()
        setModels(availableModels)
      } catch (error) {
        console.error('Error fetching models:', error)
        // Silently fail for better UX - could add a subtle error indicator later
      } finally {
        setLoading(false)
      }
    }

    fetchModels()
  }, [])

  const handleClick = event => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleModelSelect = modelId => {
    onModelChange(modelId)
    handleClose()
  }

  // Don't render if model selection is disabled
  if (!config.ENABLE_MODEL_SELECTION) {
    return null
  }

  const selectedModel = models[currentModel] || Object.values(models)[0]
  const modelKeys = Object.keys(models)

  if (loading || modelKeys.length === 0) {
    return (
      <Box>
        <ModelSelectorSkeleton />
      </Box>
    )
  }

  return (
    <Box>
      <Button
        id="model-selector-button"
        aria-controls={open ? 'model-selector-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
        endIcon={
          <KeyboardArrowDownIcon
            sx={{
              fontSize: 16,
              transition: 'transform 0.2s ease',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        }
        sx={{
          height: 28,
          px: 1.5,
          py: 0.5,
          backgroundColor: isDarkMode
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(0, 0, 0, 0.03)',
          border: `1px solid ${
            isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'
          }`,
          borderRadius: 1.5,
          color: 'text.primary',
          fontSize: '0.75rem',
          fontWeight: 500,
          textTransform: 'none',
          minWidth: 'auto',
          justifyContent: 'space-between',
          '&:hover': {
            backgroundColor: isDarkMode
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(0, 0, 0, 0.06)',
            borderColor: isDarkMode
              ? 'rgba(255, 255, 255, 0.2)'
              : 'rgba(0, 0, 0, 0.15)',
          },
          '&:focus': {
            outline: 'none',
            borderColor: isDarkMode ? '#90caf9' : '#1976d2',
            boxShadow: `0 0 0 2px ${
              isDarkMode
                ? 'rgba(144, 202, 249, 0.2)'
                : 'rgba(25, 118, 210, 0.2)'
            }`,
          },
          transition: 'all 0.2s ease',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.75rem',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 150,
          }}
        >
          {selectedModel?.name || 'Select Model'}
        </Typography>
      </Button>

      <Menu
        id="model-selector-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'model-selector-button',
          sx: {py: 0.5},
        }}
        transformOrigin={{horizontal: 'left', vertical: 'top'}}
        anchorOrigin={{horizontal: 'left', vertical: 'bottom'}}
        TransitionComponent={Fade}
        transitionDuration={200}
        sx={{
          '& .MuiPaper-root': {
            borderRadius: 2,
            minWidth: 280,
            maxWidth: 400,
            border: `1px solid ${
              isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'
            }`,
            boxShadow: isDarkMode
              ? '0 8px 32px rgba(0, 0, 0, 0.4)'
              : '0 8px 32px rgba(0, 0, 0, 0.12)',
            backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
            backgroundImage: 'none',
            mt: 0.5,
          },
        }}
      >
        {modelKeys.map(modelId => (
          <ModelSelectorItem
            key={modelId}
            modelId={modelId}
            modelInfo={models[modelId]}
            isSelected={currentModel === modelId}
            onClick={handleModelSelect}
            isDarkMode={isDarkMode}
          />
        ))}
      </Menu>
    </Box>
  )
}

export default ModelSelector
