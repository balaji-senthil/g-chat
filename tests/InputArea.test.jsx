import React from 'react'
import {render, screen, fireEvent} from '@testing-library/react'
import {describe, it, expect, vi, beforeEach} from 'vitest'
import InputArea from '../src/components/InputArea'
import {ThemeProvider} from '../src/context/ThemeContext'
import {ChatContext} from '../src/context/ChatContext'
import {ThreadProvider} from '../src/context/ThreadContext'

// Mock the dependencies
vi.mock('../src/components/ModelSelector', () => ({
  default: () => (
    <div data-testid="model-selector-mock">ModelSelector Mock</div>
  ),
}))

vi.mock('../src/components/RateLimitIndicator', () => ({
  default: () => (
    <div data-testid="rate-limit-indicator-mock">RateLimitIndicator Mock</div>
  ),
}))

vi.mock('../src/services/apiService', () => ({
  config: {
    ENABLE_MODEL_SELECTION: true,
  },
}))

const renderWithProviders = (ui, chatContextOverrides = {}) => {
  const defaultChatContext = {
    messages: [],
    isGenerating: false,
    handleSendMessage: vi.fn(),
    regenerateResponse: vi.fn(),
    stopGeneration: vi.fn(),
    clearMessages: vi.fn(),
    lastUserMessage: '',
    currentModel: 'gemini-2.0-flash-lite',
    handleModelChange: vi.fn(),
  }
  const chatContextValue = {...defaultChatContext, ...chatContextOverrides}

  return render(
    <ThreadProvider>
      <ThemeProvider>
        <ChatContext.Provider value={chatContextValue}>
          {ui}
        </ChatContext.Provider>
      </ThemeProvider>
    </ThreadProvider>,
  )
}

describe('InputArea Component', () => {
  it('renders correctly with mocked components', () => {
    renderWithProviders(<InputArea />)

    // Check for the main input field
    const inputElement = screen.getByPlaceholderText('Type your message...')
    expect(inputElement).toBeInTheDocument()

    // Check that mocked components are rendered
    expect(screen.getByTestId('rate-limit-indicator-mock')).toBeInTheDocument()
    expect(screen.getByTestId('model-selector-mock')).toBeInTheDocument()
  })

  it('updates input value when user types', () => {
    renderWithProviders(<InputArea />)
    const inputElement = screen.getByPlaceholderText('Type your message...')

    fireEvent.change(inputElement, {target: {value: 'Hello world'}})

    expect(inputElement.value).toBe('Hello world')
  })

  it('calls handleSendMessage when button is clicked with non-empty input', () => {
    const mockSendMessage = vi.fn()
    renderWithProviders(<InputArea />, {handleSendMessage: mockSendMessage})

    const inputElement = screen.getByPlaceholderText('Type your message...')
    fireEvent.change(inputElement, {target: {value: 'Test message'}})

    const sendButton = screen.getByText('Send')
    fireEvent.click(sendButton)

    // Updated to expect two arguments: message and threadId (undefined in test)
    expect(mockSendMessage).toHaveBeenCalledWith('Test message', undefined)
    expect(inputElement.value).toBe('') // Input should be cleared after sending
  })

  it('does not call handleSendMessage when button is clicked with empty input', () => {
    const mockSendMessage = vi.fn()
    renderWithProviders(<InputArea />, {handleSendMessage: mockSendMessage})

    // The button should be disabled when input is empty
    const sendButton = screen.getByText('Send')
    expect(sendButton).toBeDisabled()

    fireEvent.click(sendButton)
    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  it('calls clearMessages when clear button is clicked', () => {
    const mockClearMessages = vi.fn()
    renderWithProviders(<InputArea />, {clearMessages: mockClearMessages})

    const clearButton = screen.getByLabelText('Clear all messages')
    fireEvent.click(clearButton)

    expect(mockClearMessages).toHaveBeenCalled()
  })

  it('disables input and shows stop button during generation', () => {
    renderWithProviders(<InputArea />, {isGenerating: true})

    // Input should be disabled
    const inputElement = screen.getByPlaceholderText('Type your message...')
    expect(inputElement).toBeDisabled()

    // Stop button should be shown
    const stopButton = screen.getByLabelText('stop generation')
    expect(stopButton).toBeInTheDocument()

    // Send button should be disabled
    const sendButton = screen.getByText('Send')
    expect(sendButton).toBeDisabled()
  })

  it('renders regenerate button when there is a previous message', () => {
    renderWithProviders(<InputArea />, {lastUserMessage: 'Previous message'})

    const regenerateButton = screen.getByLabelText('regenerate response')
    expect(regenerateButton).toBeInTheDocument()
  })

  it('calls regenerateResponse when regenerate button is clicked', () => {
    const mockRegenerateResponse = vi.fn()
    renderWithProviders(<InputArea />, {
      lastUserMessage: 'Previous message',
      regenerateResponse: mockRegenerateResponse,
    })

    const regenerateButton = screen.getByLabelText('regenerate response')
    fireEvent.click(regenerateButton)

    expect(mockRegenerateResponse).toHaveBeenCalled()
  })
})
