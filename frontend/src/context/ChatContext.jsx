import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from 'react'
import {useThread} from './ThreadContext'
import {
  abortGeneration,
  config,
  sendMessageInThread,
  clearThreadMessages,
} from '../services/api'

// Create context outside of any component
const ChatContext = createContext(null)

// Create hook outside of any component
export const useChatContext = () => {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }
  return context
}

export const ChatProvider = ({children}) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [lastUserMessage, setLastUserMessage] = useState('') // Keep for non-thread regenerate?
  const [wasStopped, setWasStopped] = useState(false)

  const {
    selectedThread,
    addMessageToThread,
    updateThreadMessageChunk,
    finalizeThreadMessage,
    removePartialThreadMessage,
    clearCurrentThreadMessages,
    updateThreadModel,
    getCurrentThreadMessages,
    getCurrentThreadModel,
    fetchThreadMessages, // Keep for refresh logic
    fetchThreads, // Add this to refresh sidebar after message
  } = useThread()

  // Get current messages and model based on selected thread
  const currentMessages = getCurrentThreadMessages()
  const currentModel = getCurrentThreadModel() || config.DEFAULT_MODEL // Fallback to default

  /**
   * Handles sending a message from the user and getting AI response
   * @param {string} message - User's message
   * @param {string} threadId - Optional thread identifier (should always be present if selectedThread exists)
   */
  const handleSendMessage = async (message, threadId) => {
    const activeThreadId = threadId || selectedThread?.id

    // Only handle messages if a thread is active
    if (!activeThreadId) {
      console.warn('Cannot send message: No active thread selected.')
      // Optionally handle non-threaded chat here if needed
      return
    }

    setLastUserMessage(message) // Still useful for potential regenerate?
    setWasStopped(false)
    setIsGenerating(true)

    try {
      console.log(`Sending message to thread ${activeThreadId}: ${message}`)

      const userMessage = {
        role: 'user',
        content: message,
        created_at: new Date(),
      }
      addMessageToThread(activeThreadId, userMessage)

      // Don't add AI placeholder immediately - let typing animation show instead
      let aiMessageAdded = false

      const response = await sendMessageInThread(
        message,
        activeThreadId,
        currentModel, // Use the thread-specific model
        chunk => {
          // Add AI message placeholder only when we receive the first chunk
          if (!aiMessageAdded) {
            const aiPlaceholder = {
              role: 'model',
              content: chunk,
              created_at: new Date(),
              isPartial: true,
              model: currentModel, // Store model used for this response
            }
            addMessageToThread(activeThreadId, aiPlaceholder)
            aiMessageAdded = true
          } else {
            updateThreadMessageChunk(activeThreadId, chunk)
          }
        },
      )

      // Set generating to false BEFORE finalizing to prevent typing bubble flicker
      setIsGenerating(false)

      // Finalize the message using backend response if available, otherwise use last chunk
      if (aiMessageAdded) {
        finalizeThreadMessage(activeThreadId, response?.content)
      }

      // Refresh the thread list in the sidebar to show updated preview
      await fetchThreads()
    } catch (error) {
      // Set generating to false before handling the error to prevent typing bubble flicker
      setIsGenerating(false)

      if (error.message === 'STOPPED') {
        console.log('Thread message generation stopped by user')
        setWasStopped(true)
        if (aiMessageAdded) {
          finalizeThreadMessage(activeThreadId, null, true) // Mark as stopped
        }
      } else {
        console.error('Error sending message in thread:', error)
        if (aiMessageAdded) {
          removePartialThreadMessage(activeThreadId) // Remove the placeholder on error
        }
        alert(`Error sending message: ${error.message}`)
      }
    }
  }

  /**
   * Regenerates the last AI response for the most recent user query
   * NOTE: This needs significant rework for thread context.
   * It currently relies on non-threaded state (`lastUserMessage`, `messages`).
   * Disabling for threads for now.
   */
  const regenerateResponse = async () => {
    if (selectedThread) {
      console.warn('Regenerate response is not supported in thread mode yet.')
      alert('Regenerate response is not supported in thread mode yet.')
      return
    }

    // --- Keep existing non-threaded logic (if non-threaded mode is desired) ---
    if (!lastUserMessage) return
    setWasStopped(false)
    console.log('Non-threaded regenerate called')
  }

  /**
   * Stops the AI response generation in progress
   */
  const stopGeneration = () => {
    if (!isGenerating) return
    setWasStopped(true) // Mark intent to stop
    abortGeneration() // Abort the API call
    setIsGenerating(false) // Reset generating state immediately
  }

  /**
   * Handles changing the AI model for the current thread
   * @param {string} modelId - The model identifier
   */
  const handleModelChange = modelId => {
    if (selectedThread?.id) {
      updateThreadModel(selectedThread.id, modelId)
    }
  }

  /**
   * Reset all chat context state (for logout)
   */
  const resetChatContext = useCallback(() => {
    setIsGenerating(false)
    setLastUserMessage('')
    setWasStopped(false)
  }, [])

  // Listen for logout events to clear context data
  useEffect(() => {
    const handleUserLogout = () => {
      resetChatContext()
    }

    window.addEventListener('userLogout', handleUserLogout)

    return () => {
      window.removeEventListener('userLogout', handleUserLogout)
    }
  }, [resetChatContext])

  /**
   * Clear all messages in the current thread (both local state and backend)
   */
  const clearMessages = async () => {
    if (selectedThread?.id) {
      try {
        // Clear messages from backend
        await clearThreadMessages(selectedThread.id)

        // Clear local state
        clearCurrentThreadMessages(selectedThread.id)
        setLastUserMessage('') // Clear last message for this thread too
        setWasStopped(false)
      } catch (err) {
        console.error('Error clearing messages:', err)
        alert('Failed to clear messages. Please try again.')
      }
    } else {
      console.warn('Cannot clear messages: No thread selected.')
    }
  }

  // Value to be provided by the context
  const value = {
    currentMessages, // Use this instead
    isGenerating,
    handleSendMessage,
    regenerateResponse, // Keep but potentially disabled/modified for threads
    stopGeneration,
    clearMessages, // Now clears current thread
    lastUserMessage, // Still potentially useful?
    currentModel, // Now reflects current thread's model
    handleModelChange, // Now updates current thread's model
    resetChatContext,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
