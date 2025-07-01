import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react'
import {
  getThreads,
  createThread,
  getThreadMessages,
  deleteThread as apiDeleteThread,
  updateThread as apiUpdateThread,
  getThreadPreviews,
  config,
} from '../services/api'

// Create context outside of any component
const ThreadContext = createContext(null)

// Create hook outside of any component
export const useThread = () => {
  const context = useContext(ThreadContext)
  if (!context) {
    throw new Error('useThread must be used within a ThreadProvider')
  }
  return context
}

export const ThreadProvider = ({children}) => {
  const [threads, setThreads] = useState([])
  const [selectedThread, setSelectedThread] = useState(null)
  // Store messages per thread ID
  const [messagesByThreadId, setMessagesByThreadId] = useState({})
  // Store model per thread ID
  const [modelByThreadId, setModelByThreadId] = useState({})
  const [error, setError] = useState(null)

  // Consolidated loading states
  const [isLoadingThreads, setIsLoadingThreads] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(new Set()) // Track which threads are loading messages

  // Reset all thread context state (for logout)
  const resetThreadContext = useCallback(() => {
    setThreads([])
    setSelectedThread(null)
    setMessagesByThreadId({})
    setModelByThreadId({})
    setError(null)
    setIsLoadingThreads(false)
    setIsLoadingMessages(new Set())
  }, [])

  // Listen for logout events to clear context data
  useEffect(() => {
    const handleUserLogout = () => {
      resetThreadContext()
    }

    window.addEventListener('userLogout', handleUserLogout)

    return () => {
      window.removeEventListener('userLogout', handleUserLogout)
    }
  }, [resetThreadContext])

  // Get messages for current thread
  const getCurrentThreadMessages = useCallback(() => {
    if (!selectedThread?.id) return []
    return messagesByThreadId[selectedThread.id] || []
  }, [selectedThread, messagesByThreadId])

  // Get model for current thread
  const getCurrentThreadModel = useCallback(() => {
    if (!selectedThread?.id) {
      return config.DEFAULT_MODEL
    }
    const model = modelByThreadId[selectedThread.id] || config.DEFAULT_MODEL
    return model
  }, [selectedThread, modelByThreadId])

  // Add a message to a thread
  const addMessageToThread = useCallback((threadId, message) => {
    setMessagesByThreadId(prev => ({
      ...prev,
      [threadId]: [...(prev[threadId] || []), message],
    }))
  }, [])

  // Update a message chunk in a thread
  const updateThreadMessageChunk = useCallback((threadId, chunk) => {
    setMessagesByThreadId(prev => {
      const messages = prev[threadId] || []
      const lastMessage = messages[messages.length - 1]
      if (lastMessage?.isPartial) {
        const updatedMessages = [...messages]
        updatedMessages[updatedMessages.length - 1] = {
          ...lastMessage,
          content: (lastMessage.content || '') + chunk,
        }
        return {...prev, [threadId]: updatedMessages}
      }
      return prev
    })
  }, [])

  // Finalize a message in a thread
  const finalizeThreadMessage = useCallback(
    (threadId, content, isStopped = false) => {
      setMessagesByThreadId(prev => {
        const messages = prev[threadId] || []
        const lastMessage = messages[messages.length - 1]
        if (lastMessage?.isPartial) {
          const updatedMessages = [...messages]
          updatedMessages[updatedMessages.length - 1] = {
            ...lastMessage,
            content: content || lastMessage.content,
            isPartial: false,
            isStopped,
          }
          return {...prev, [threadId]: updatedMessages}
        }
        return prev
      })
    },
    [],
  )

  // Remove the last partial message from a thread
  const removePartialThreadMessage = useCallback(threadId => {
    setMessagesByThreadId(prev => {
      const messages = prev[threadId] || []
      const lastMessage = messages[messages.length - 1]
      if (lastMessage?.isPartial) {
        return {
          ...prev,
          [threadId]: messages.slice(0, -1),
        }
      }
      return prev
    })
  }, [])

  // Clear messages for a thread
  const clearCurrentThreadMessages = useCallback(threadId => {
    setMessagesByThreadId(prev => ({
      ...prev,
      [threadId]: [],
    }))
  }, [])

  // Check if messages are loading for a specific thread
  const isLoadingMessagesForThread = useCallback(
    threadId => {
      return isLoadingMessages.has(threadId)
    },
    [isLoadingMessages],
  )

  // Update model for a thread
  const updateThreadModel = useCallback((threadId, modelId) => {
    setModelByThreadId(prev => {
      const newState = {
        ...prev,
        [threadId]: modelId,
      }
      return newState
    })
  }, [])

  // Track if we're currently fetching to prevent duplicate requests
  const [isFetchingThreads, setIsFetchingThreads] = useState(false)

  // Fetch all threads
  const fetchThreads = async (force = false) => {
    // Prevent duplicate calls unless forced
    if (isFetchingThreads && !force) {
      return
    }

    setError(null)
    setIsLoadingThreads(true)
    setIsFetchingThreads(true)
    try {
      const data = await getThreadPreviews()
      setThreads(Array.isArray(data) ? data : [])
    } catch (err) {
      // Don't clear existing threads on error - preserve user data
      setError(err.message)
    } finally {
      setIsLoadingThreads(false)
      setIsFetchingThreads(false)
    }
  }

  // Create a new thread and refresh list
  const createNewThread = async title => {
    setError(null)
    try {
      // Clear previous thread selection but preserve existing messages
      setSelectedThread(null)

      const newThread = await createThread(title)

      // Add the new thread to the existing list instead of refetching all threads
      setThreads(prev => [newThread, ...prev])

      // Auto-select the newly created thread
      selectThread(newThread)

      // Set a default model for the new thread
      setModelByThreadId(prev => ({
        ...prev,
        [newThread.id]: config.DEFAULT_MODEL,
      }))
    } catch (err) {
      setError(err.message)
    }
  }

  // Select a thread
  const selectThread = useCallback(
    async thread => {
      if (!thread || !thread.id) {
        setSelectedThread(null)
        return
      }

      setSelectedThread(thread)

      // If we don't have messages for this thread yet, fetch them
      if (!messagesByThreadId[thread.id]) {
        // Add thread to loading set
        setIsLoadingMessages(prev => new Set(prev).add(thread.id))

        try {
          const messages = await getThreadMessages(thread.id)
          setMessagesByThreadId(prev => ({
            ...prev,
            [thread.id]: messages || [],
          }))
        } catch (err) {
          setError(err.message)
          setMessagesByThreadId(prev => ({
            ...prev,
            [thread.id]: [],
          }))
        } finally {
          // Remove thread from loading set
          setIsLoadingMessages(prev => {
            const newSet = new Set(prev)
            newSet.delete(thread.id)
            return newSet
          })
        }
      }
    },
    [messagesByThreadId],
  )

  // Delete a thread
  const deleteThread = async threadId => {
    if (!threadId) return

    setError(null)
    try {
      await apiDeleteThread(threadId)

      // Remove thread from state
      setThreads(prev => prev.filter(t => t.id !== threadId))

      // Clear messages for this thread
      setMessagesByThreadId(prev => {
        const newState = {...prev}
        delete newState[threadId]
        return newState
      })

      // Clear model for this thread
      setModelByThreadId(prev => {
        const newState = {...prev}
        delete newState[threadId]
        return newState
      })

      // If this was the selected thread, clear selection
      if (selectedThread?.id === threadId) {
        setSelectedThread(null)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  // Update a thread
  const updateThread = async (threadId, newTitle) => {
    if (!threadId || !newTitle) return

    setError(null)
    try {
      const updatedThread = await apiUpdateThread(threadId, newTitle)

      // Update thread in state immediately
      setThreads(prev =>
        prev.map(t => (t.id === threadId ? {...t, ...updatedThread} : t)),
      )

      // If this is the selected thread, update it
      if (selectedThread?.id === threadId) {
        setSelectedThread(prev => ({...prev, ...updatedThread}))
      }
    } catch (err) {
      setError(err.message)
      // Refresh threads on error to ensure consistency
      await fetchThreads(true)
      throw err // Re-throw to let the component handle the error
    }
  }

  const value = {
    threads,
    selectedThread,
    messagesByThreadId,
    modelByThreadId,
    error,
    fetchThreads,
    createNewThread,
    selectThread,
    deleteThread,
    updateThread,
    renameThread: updateThread,
    fetchThreadMessages: getThreadMessages,
    getCurrentThreadMessages,
    getCurrentThreadModel,
    addMessageToThread,
    updateThreadMessageChunk,
    finalizeThreadMessage,
    removePartialThreadMessage,
    clearCurrentThreadMessages,
    updateThreadModel,
    resetThreadContext,
    isLoadingThreads,
    isLoadingMessagesForThread,
  }

  return (
    <ThreadContext.Provider value={value}>{children}</ThreadContext.Provider>
  )
}
