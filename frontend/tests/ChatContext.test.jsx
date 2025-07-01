import React from 'react'
import {render, screen, act, waitFor, fireEvent} from '@testing-library/react'
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {ChatProvider, useChatContext} from '../src/context/ChatContext'
import * as apiService from '../src/services/apiService'
import {ThreadProvider} from '../src/context/ThreadContext'

// Mock the apiService
vi.mock('../src/services/apiService', () => ({
  sendMessage: vi.fn(),
  abortGeneration: vi.fn(),
  config: {
    API_URL: 'http://test-api.com/api',
    DEFAULT_MODEL: 'gemini-1.0-pro',
  },
}))

// Test component that uses the chat context
const TestComponent = () => {
  const {
    messages,
    isGenerating,
    handleSendMessage,
    clearMessages,
    stopGeneration,
    regenerateResponse,
    currentModel,
    handleModelChange,
    lastUserMessage,
  } = useChatContext()

  return (
    <div>
      <div data-testid="generation-status">
        {isGenerating ? 'Generating...' : 'Not generating'}
      </div>
      <div data-testid="message-count">{messages.length}</div>
      <div data-testid="current-model">{currentModel}</div>
      <div data-testid="last-user-message">{lastUserMessage}</div>
      <button
        data-testid="send-button"
        onClick={() => handleSendMessage('Test message')}
      >
        Send Message
      </button>
      <button
        data-testid="custom-message-button"
        onClick={() => handleSendMessage('Custom message')}
      >
        Custom Message
      </button>
      <button data-testid="clear-button" onClick={clearMessages}>
        Clear Messages
      </button>
      <button data-testid="stop-button" onClick={stopGeneration}>
        Stop Generation
      </button>
      <button data-testid="regenerate-button" onClick={regenerateResponse}>
        Regenerate Response
      </button>
      <button
        data-testid="change-model-button"
        onClick={() => handleModelChange('gemini-1.5-pro')}
      >
        Change Model
      </button>
      <div data-testid="messages">
        {messages.map((msg, idx) => (
          <div key={idx} data-testid={`message-${idx}`}>
            {msg.text}
          </div>
        ))}
      </div>
    </div>
  )
}

describe('ChatContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.alert to avoid test environment issues
    window.alert = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const renderWithProviders = ui =>
    render(
      <ThreadProvider>
        <ChatProvider>{ui}</ChatProvider>
      </ThreadProvider>,
    )

  it('provides initial empty state', () => {
    renderWithProviders(<TestComponent />)

    expect(screen.getByTestId('message-count').textContent).toBe('0')
    expect(screen.getByTestId('generation-status').textContent).toBe(
      'Not generating',
    )
    expect(screen.getByTestId('current-model').textContent).toBe(
      'gemini-1.0-pro',
    )
    expect(screen.getByTestId('last-user-message').textContent).toBe('')
  })

  it('adds a user message and sets initial AI message when handleSendMessage is called', async () => {
    // Setup mock with delayed promise to test partial state
    let resolveApiCall
    apiService.sendMessage.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveApiCall = resolve
        }),
    )

    renderWithProviders(<TestComponent />)

    // Click send button to trigger handleSendMessage
    await act(async () => {
      fireEvent.click(screen.getByTestId('send-button'))
    })

    // Check that message is added with correct format
    expect(screen.getByTestId('message-0').textContent).toBe(
      'You: Test message',
    )

    // Check that AI message is created and marked as partial
    expect(screen.getByTestId('message-1').textContent).toBe('AI:')

    // Verify generating state is set correctly
    expect(screen.getByTestId('generation-status').textContent).toBe(
      'Generating...',
    )

    // Verify lastUserMessage is updated correctly
    expect(screen.getByTestId('last-user-message').textContent).toBe(
      'Test message',
    )

    // Complete the API call
    await act(async () => {
      resolveApiCall()
    })
  })

  it('properly handles streaming response chunks', async () => {
    // Verify that streaming chunks update the message correctly
    let streamCallback

    apiService.sendMessage.mockImplementation(
      (message, messageHistory, onChunk) => {
        streamCallback = onChunk
        // Return promise that resolves after we've had a chance to test streaming
        return new Promise(resolve => {
          setTimeout(resolve, 100)
        })
      },
    )

    renderWithProviders(<TestComponent />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('send-button'))
    })

    // Send streaming chunks
    await act(async () => {
      streamCallback(' Hello')
      await new Promise(resolve => setTimeout(resolve, 10))
      streamCallback(' Hello there')
      await new Promise(resolve => setTimeout(resolve, 10))
      streamCallback(' Hello there, how can I help?')
    })

    // Check that the AI message was updated with the streamed content
    expect(screen.getByTestId('message-1').textContent).toBe(
      'AI: Hello there, how can I help?',
    )
  })

  it('marks messages as complete when streaming finishes', async () => {
    // Mock implementation that calls the chunk callback then resolves
    apiService.sendMessage.mockImplementation(
      (message, messageHistory, onChunk) => {
        onChunk(' This is a complete response.')
        return Promise.resolve()
      },
    )

    renderWithProviders(<TestComponent />)

    // Send a message
    await act(async () => {
      fireEvent.click(screen.getByTestId('send-button'))
      // Wait for the state updates to complete
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    // Verify the AI message is complete and has been updated
    expect(screen.getByTestId('message-1').textContent).toBe(
      'AI: This is a complete response.',
    )
    expect(screen.getByTestId('generation-status').textContent).toBe(
      'Not generating',
    )
  })

  it('handles stopping generation correctly', async () => {
    // Mock implementation that never resolves until stopped
    let rejectApiCall
    apiService.sendMessage.mockImplementation(
      (message, messageHistory, onChunk) => {
        onChunk(' Starting to generate...')

        return new Promise((resolve, reject) => {
          rejectApiCall = () => reject(new Error('STOPPED'))
        })
      },
    )

    renderWithProviders(<TestComponent />)

    // Start generation
    await act(async () => {
      fireEvent.click(screen.getByTestId('send-button'))
    })

    // Verify generation state
    expect(screen.getByTestId('generation-status').textContent).toBe(
      'Generating...',
    )
    expect(screen.getByTestId('message-1').textContent).toBe(
      'AI: Starting to generate...',
    )

    // Trigger stop generation
    await act(async () => {
      fireEvent.click(screen.getByTestId('stop-button'))

      // Simulate API rejection with STOPPED error
      rejectApiCall()

      // Wait for state updates
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    // Verify the message was marked as stopped
    expect(screen.getByTestId('message-1').textContent).contains('(stopped)')
    expect(screen.getByTestId('generation-status').textContent).toBe(
      'Not generating',
    )

    // Verify abortGeneration was called
    expect(apiService.abortGeneration).toHaveBeenCalled()
  })

  it('clears all messages and state when clearMessages is called', async () => {
    // Setup with a message already in the chat
    apiService.sendMessage.mockResolvedValue()

    renderWithProviders(<TestComponent />)

    // First add a message
    await act(async () => {
      fireEvent.click(screen.getByTestId('send-button'))
      // Allow promises to resolve
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    // Verify there are messages
    expect(screen.getByTestId('message-count').textContent).not.toBe('0')
    expect(screen.getByTestId('last-user-message').textContent).toBe(
      'Test message',
    )

    // Clear messages
    await act(async () => {
      fireEvent.click(screen.getByTestId('clear-button'))
    })

    // Verify state is reset
    expect(screen.getByTestId('message-count').textContent).toBe('0')
    expect(screen.getByTestId('last-user-message').textContent).toBe('')
    expect(screen.queryAllByTestId(/message-\d+/)).toHaveLength(0)
  })

  it('changes model when handleModelChange is called', async () => {
    renderWithProviders(<TestComponent />)

    // Verify initial model
    expect(screen.getByTestId('current-model').textContent).toBe(
      'gemini-1.0-pro',
    )

    // Change model
    await act(async () => {
      fireEvent.click(screen.getByTestId('change-model-button'))
    })

    // Verify model was updated
    expect(screen.getByTestId('current-model').textContent).toBe(
      'gemini-1.5-pro',
    )
  })

  it('regenerates responses correctly', async () => {
    // Setup with a completed conversation
    apiService.sendMessage.mockImplementation(
      (message, messageHistory, onChunk) => {
        onChunk(
          ' This is ' +
            (message === 'Test message' ? 'the first' : 'a regenerated') +
            ' response',
        )
        return Promise.resolve()
      },
    )

    renderWithProviders(<TestComponent />)

    // Send initial message
    await act(async () => {
      fireEvent.click(screen.getByTestId('send-button'))
      // Allow promises to resolve
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    // Verify initial response
    expect(screen.getByTestId('message-1').textContent).toBe(
      'AI: This is the first response',
    )

    // Regenerate response
    await act(async () => {
      fireEvent.click(screen.getByTestId('regenerate-button'))
      // Allow promises to resolve
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    // Should still have 2 messages (user + AI)
    expect(screen.getByTestId('message-count').textContent).toBe('2')
  })

  it('handles errors during message sending properly', async () => {
    // Setup mock to reject with an error
    apiService.sendMessage.mockRejectedValue(new Error('Network error'))

    renderWithProviders(<TestComponent />)

    // Send a message that will error
    await act(async () => {
      fireEvent.click(screen.getByTestId('send-button'))
      // Allow promises to reject
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    // Verify partial AI message is removed
    expect(screen.getByTestId('message-count').textContent).toBe('1') // Only user message remains
    expect(screen.getByTestId('message-0').textContent).toBe(
      'You: Test message',
    )

    // Verify alert was shown
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Error'))

    // Verify generation state is reset
    expect(screen.getByTestId('generation-status').textContent).toBe(
      'Not generating',
    )
  })

  it('handles multiple messages correctly', async () => {
    let messageCount = 0
    // Setup mock with immediate resolution
    apiService.sendMessage.mockImplementation(
      (message, messageHistory, onChunk) => {
        messageCount++
        onChunk(` Response ${messageCount}`)
        return Promise.resolve()
      },
    )

    renderWithProviders(<TestComponent />)

    // Send first message
    await act(async () => {
      fireEvent.click(screen.getByTestId('send-button'))
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    // Send second message
    await act(async () => {
      fireEvent.click(screen.getByTestId('custom-message-button'))
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    // Verify we have 4 messages (2 user, 2 AI)
    expect(screen.getByTestId('message-count').textContent).toBe('4')
    expect(screen.getByTestId('message-0').textContent).toBe(
      'You: Test message',
    )
    expect(screen.getByTestId('message-1').textContent).toBe('AI: Response 1')
    expect(screen.getByTestId('message-2').textContent).toBe(
      'You: Custom message',
    )
    expect(screen.getByTestId('message-3').textContent).toBe('AI: Response 2')
  })

  it('does not regenerate when there is no lastUserMessage', async () => {
    renderWithProviders(<TestComponent />)

    // Try to regenerate with no previous message
    await act(async () => {
      fireEvent.click(screen.getByTestId('regenerate-button'))
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    // Verify sendMessage was not called
    expect(apiService.sendMessage).not.toHaveBeenCalled()
  })

  it('sends currentModel to API when sending messages', async () => {
    renderWithProviders(<TestComponent />)

    // Change model first
    await act(async () => {
      fireEvent.click(screen.getByTestId('change-model-button'))
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    // Send a message
    await act(async () => {
      fireEvent.click(screen.getByTestId('send-button'))
      await new Promise(resolve => setTimeout(resolve, 10))
    })

    // Verify API was called with correct model
    expect(apiService.sendMessage).toHaveBeenCalledWith(
      'Test message',
      expect.any(Array),
      expect.any(Function),
      'gemini-1.5-pro',
    )
  })
})
