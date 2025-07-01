import React, {useState} from 'react'
import {
  Button,
  TextField,
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import StopIcon from '@mui/icons-material/Stop'
import RefreshIcon from '@mui/icons-material/Refresh'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import {useChatContext} from '../context/ChatContext'
import {useThread} from '../context/ThreadContext'
import ModelSelector from './ModelSelector'
import {config} from '../services/api'

/**
 * ControlButton component for action buttons
 * @param {Object} props - Component props
 * @returns {JSX.Element}
 */
const ControlButton = ({
  onClick,
  disabled = false,
  color = 'primary',
  icon,
  title,
  testId,
  ariaLabel,
}) => (
  <Tooltip title={title}>
    <IconButton
      onClick={onClick}
      color={color}
      aria-label={ariaLabel || title.toLowerCase()}
      disabled={disabled}
      data-testid={testId}
      id={`button-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {icon}
    </IconButton>
  </Tooltip>
)

/**
 * ControlButtons component - Contains control buttons for chat operations
 * @param {Object} props - Component props
 * @returns {JSX.Element}
 */
const ControlButtons = ({
  clearMessages,
  regenerateResponse,
  stopGeneration,
  isGenerating,
  lastUserMessage,
  currentModel,
  handleModelChange,
}) => (
  <Stack
    direction="row"
    spacing={1}
    sx={{mb: 2, justifyContent: 'space-between', alignItems: 'center'}}
    id="chat-controls"
    data-testid="chat-controls"
  >
    {/* Left side: Control buttons */}
    <Stack direction="row" spacing={1}>
      <ControlButton
        onClick={clearMessages}
        disabled={isGenerating}
        icon={<DeleteSweepIcon />}
        title="Clear all messages"
        ariaLabel="Clear all messages"
        testId="clear-button"
      />

      {lastUserMessage && (
        <ControlButton
          onClick={regenerateResponse}
          disabled={isGenerating}
          icon={<RefreshIcon />}
          title="Regenerate response"
          ariaLabel="regenerate response"
          testId="regenerate-button"
        />
      )}

      {isGenerating && (
        <ControlButton
          onClick={stopGeneration}
          color="error"
          icon={<StopIcon />}
          title="Stop generation"
          ariaLabel="stop generation"
          testId="stop-button"
        />
      )}
    </Stack>

    {/* Right side: Model selector */}
    {config.ENABLE_MODEL_SELECTION && (
      <ModelSelector
        currentModel={currentModel}
        onModelChange={handleModelChange}
      />
    )}
  </Stack>
)

/**
 * MessageInput component - For typing and sending messages
 * @param {Object} props - Component props
 * @returns {JSX.Element}
 */
const MessageInput = ({input, setInput, handleSubmit, isGenerating}) => (
  <Stack
    direction="row"
    spacing={1}
    alignItems="center"
    id="message-input-container"
  >
    <TextField
      fullWidth
      placeholder="Type your message..."
      value={input}
      onChange={e => setInput(e.target.value)}
      disabled={isGenerating}
      onKeyUp={e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          handleSubmit(e)
        }
      }}
      multiline
      maxRows={4}
      sx={{flexGrow: 1}}
      id="message-input"
      data-testid="message-input"
    />
    <Button
      variant="contained"
      color="primary"
      endIcon={<SendIcon />}
      type="submit"
      disabled={isGenerating || input.trim() === ''}
      id="send-button"
      data-testid="send-button"
    >
      Send
    </Button>
  </Stack>
)

/**
 * InputArea component for chat interaction
 * @returns {JSX.Element}
 */
function InputArea() {
  const [input, setInput] = useState('')
  const {
    handleSendMessage,
    regenerateResponse,
    stopGeneration,
    clearMessages,
    isGenerating,
    lastUserMessage,
    currentModel,
    handleModelChange,
  } = useChatContext()
  const {selectedThread} = useThread()

  const handleSubmit = e => {
    e.preventDefault()
    if (input.trim() === '' || !selectedThread) return

    // Send message with threadId if a thread is selected
    handleSendMessage(input, selectedThread?.id)
    setInput('') // Clear input after sending
  }

  // Don't render the input area if no thread is selected
  if (!selectedThread) {
    return (
      <Box
        sx={{
          borderTop: 1,
          borderColor: 'divider',
          p: 2,
          backgroundColor: theme => theme.palette.background.paper,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100px',
        }}
        id="input-area-disabled"
        data-testid="input-area-disabled"
      >
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{textAlign: 'center'}}
        >
          Please select a topic from the sidebar to start chatting
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        borderTop: 1,
        borderColor: 'divider',
        p: 2,
        backgroundColor: theme => theme.palette.background.paper,
      }}
      id="input-area"
      data-testid="input-area"
    >
      {/* Control buttons with inline model selector */}
      <ControlButtons
        clearMessages={clearMessages}
        regenerateResponse={regenerateResponse}
        stopGeneration={stopGeneration}
        isGenerating={isGenerating}
        lastUserMessage={lastUserMessage}
        currentModel={currentModel}
        handleModelChange={handleModelChange}
      />

      {/* Text input and send button */}
      <MessageInput
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        isGenerating={isGenerating}
      />
    </Box>
  )
}

export default InputArea
