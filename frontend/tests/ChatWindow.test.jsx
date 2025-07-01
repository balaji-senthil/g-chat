import React from 'react'
import {render, screen, within} from '@testing-library/react'
import {describe, it, expect, vi, beforeEach} from 'vitest'
import ChatWindow from '../src/components/ChatWindow'
import {ThemeProvider} from '../src/context/ThemeContext'
import {ChatContext} from '../src/context/ChatContext'

// Create a wrapper that provides both theme and chat contexts
const renderWithContexts = (
  ui,
  {messagesValue = [], isTypingValue = false} = {},
) => {
  const chatContextValue = {
    messages: messagesValue,
    isTyping: isTypingValue,
    handleSendMessage: vi.fn(),
    clearMessages: vi.fn(),
    regenerateResponse: vi.fn(),
    lastUserMessage: '',
  }

  return render(
    <ThemeProvider>
      <ChatContext.Provider value={chatContextValue}>{ui}</ChatContext.Provider>
    </ThemeProvider>,
  )
}

describe('ChatWindow Component', () => {
  const mockMessages = [
    {text: 'You: Hello there'},
    {text: 'AI: Hi, how can I help you today?'}
  ]

  it('renders correctly without messages', () => {
    const {container} = renderWithContexts(<ChatWindow />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders messages correctly', () => {
    renderWithContexts(<ChatWindow />, {messagesValue: mockMessages})

    // Get all message elements by their test IDs
    const message0 = screen.getByTestId('user-message-content')
    const message1 = screen.getByTestId('ai-message-content')
    
    // Check user messages
    expect(message0.textContent).toContain('Hello there')
    
    // Check AI message
    expect(message1.textContent).toContain('Hi, how can I help you today?')

  })

  it('does not show typing indicator when isTyping is false', () => {
    renderWithContexts(<ChatWindow />, {messagesValue: mockMessages})
    expect(screen.queryByText('Typing...')).not.toBeInTheDocument()
  })

  it('applies different styles to user and AI messages', () => {
    const {container} = renderWithContexts(<ChatWindow />, {
      messagesValue: mockMessages,
    })

    // We're checking if the background colors are applied differently
    const papers = container.querySelectorAll('.MuiPaper-root')
    expect(papers.length).toBe(mockMessages.length)

    // User message should have a different background color
    const userMessageStyles = window.getComputedStyle(papers[0])
    const aiMessageStyles = window.getComputedStyle(papers[1])
    expect(userMessageStyles.backgroundColor).not.toBe(
      aiMessageStyles.backgroundColor,
    )
  })

  it('scrolls to bottom when new messages are added', () => {
    // Mock the scrollHeight property and create a ref mock
    const mockRef = {
      current: {
        scrollTop: 0,
        scrollHeight: 1000,
      },
    }

    // Replace the default useRef implementation
    const originalUseRef = React.useRef
    React.useRef = vi.fn().mockReturnValue(mockRef)

    const {rerender} = renderWithContexts(<ChatWindow />, {
      messagesValue: mockMessages,
    })

    // Check that scrollTop was set to scrollHeight
    expect(mockRef.current.scrollTop).toBe(mockRef.current.scrollHeight)

    // Add a new message and rerender
    const newMessages = [...mockMessages, {text: 'AI: Here is the answer'}]

    rerender(
      <ThemeProvider>
        <ChatContext.Provider
          value={{
            messages: newMessages,
            isTyping: false,
            handleSendMessage: vi.fn(),
            clearMessages: vi.fn(),
          }}
        >
          <ChatWindow />
        </ChatContext.Provider>
      </ThemeProvider>,
    )

    // Check that it scrolled to bottom again
    expect(mockRef.current.scrollTop).toBe(mockRef.current.scrollHeight)

    // Restore the original useRef
    React.useRef = originalUseRef
  })
})
