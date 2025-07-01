/**
 * API service for connecting to the FastAPI backend with Google Gemini
 */

// Create an AbortController to handle stopping generation
let controller = new AbortController()

// Get API URL from environment variables or use a default
const API_URL = import.meta.env.VITE_API_URL

// Get default model from environment variables
const DEFAULT_MODEL = import.meta.env.VITE_DEFAULT_MODEL

// Feature flags
const ENABLE_HISTORY = import.meta.env.VITE_ENABLE_HISTORY === 'true' || true
const ENABLE_MODEL_SELECTION =
  import.meta.env.VITE_ENABLE_MODEL_SELECTION === 'true' || false

// Global logout callback - will be set by AuthContext
let globalLogoutCallback = null

/**
 * Set the global logout callback to be called on 401 errors
 * @param {Function} callback - Function to call when 401 error occurs
 */
export const setGlobalLogoutCallback = callback => {
  globalLogoutCallback = callback
}

/**
 * Handle API response and check for 401 errors
 * @param {Response} response - Fetch response object
 * @param {string} errorContext - Context for error message
 * @returns {Response} - The same response if no 401 error
 * @throws {Error} - Throws error for non-ok responses
 */
const handleApiResponse = async (response, errorContext = 'API request') => {
  if (!response.ok) {
    if (response.status === 401) {
      console.warn('401 Unauthorized - Token expired or invalid')
      // Call global logout callback if available
      if (globalLogoutCallback) {
        globalLogoutCallback()
      }
      throw new Error('Session expired. Please log in again.')
    }
    throw new Error(`${errorContext} failed: ${response.status}`)
  }
  return response
}

/**
 * Resets the controller to allow a new generation
 */
export const resetController = () => {
  controller = new AbortController()
}

/**
 * Aborts the current generation in progress
 */
export const abortGeneration = () => {
  controller.abort()
  resetController()
}

/**
 * Send a message in a thread
 * @param {string} userMessage - User's message
 * @param {string} threadId - Thread ID
 * @param {string} model - Model to use
 * @param {function} onChunk - Optional callback for streaming chunks
 * @returns {Promise<Object>} - AI response or null if streaming
 */
export const sendMessageInThread = async (
  userMessage,
  threadId,
  model = DEFAULT_MODEL,
  onChunk = null,
) => {
  // Reset controller if streaming
  if (onChunk) resetController()

  // Use streaming as requested
  const useStreaming = !!onChunk

  try {
    const signal = useStreaming ? controller.signal : null

    // Configure the request - stream:true as requested
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        question: userMessage,
        model: model,
      }),
    }

    if (signal) {
      fetchOptions.signal = signal
    }

    const response = await fetch(`${API_URL}/chat/${threadId}`, fetchOptions)

    await handleApiResponse(response, 'sendMessageInThread')

    // Handle streaming response if content-type indicates streaming
    if (
      useStreaming &&
      response.headers.get('content-type')?.includes('text/event-stream')
    ) {
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let currentResponse = ''

      while (true) {
        if (signal?.aborted) {
          throw new Error('Generation aborted')
        }

        const {done, value} = await reader.read()

        if (done) {
          break
        }

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6)

            if (data === '[DONE]') {
              break
            }

            try {
              const parsedData = JSON.parse(data)
              if (parsedData.content) {
                const newContent = parsedData.content
                currentResponse += newContent
                onChunk(newContent, currentResponse) // Send both new content and full response
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e)
            }
          }
        }
      }

      return null // Nothing to return for streaming
    } else {
      // For non-streaming responses or if streaming failed but response is still OK
      const responseData = await response.json()

      // If we're supposed to use streaming but got a regular response
      if (useStreaming && onChunk && responseData.content) {
        onChunk(responseData.content, responseData.content) // Send content as both new and full
      }

      return responseData
    }
  } catch (error) {
    // If we get the StreamingResponse error, fallback to a non-streaming approach
    if (error.message && error.message.includes('StreamingResponse')) {
      console.warn(
        'Streaming not supported by backend, falling back to regular request',
      )

      // Try again with streaming disabled
      return sendMessageInThread(userMessage, threadId, model, null)
    }

    if (
      useStreaming &&
      (error.name === 'AbortError' || error.message === 'Generation aborted')
    ) {
      console.log('Thread message generation was stopped by user')
      throw new Error('STOPPED')
    }
    throw error
  }
}

// Configuration object for use by other modules
export const config = {
  DEFAULT_MODEL,
  ENABLE_HISTORY,
  ENABLE_MODEL_SELECTION,
  API_URL,
}

/**
 * Authentication Services
 */

/**
 * Login with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Object>} - Token response with access_token and expiration
 */
export const login = async (email, password) => {
  if (!email || !password) {
    throw new Error('Email and password are required')
  }

  // FastAPI expects form data for OAuth2
  const formData = new URLSearchParams()
  formData.append('username', email)
  formData.append('password', password)

  const response = await fetch(`${API_URL}/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid credentials')
    }
    // For login, we don't want to trigger logout on other errors since user isn't logged in yet
    throw new Error(`Login failed: ${response.status}`)
  }

  const data = await response.json()
  // Store token in localStorage for the API client to use
  localStorage.setItem('auth_token', data.access_token)
  // Optionally store expiration if provided
  if (data.expires_at) {
    localStorage.setItem('auth_expires_at', String(data.expires_at))
  }
  return data
}

/**
 * Register a new user
 * @param {string} name - User's name
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Object>} - Newly created user
 */
export const register = async (name, email, password) => {
  if (!name || !email || !password) {
    throw new Error('All fields are required')
  }

  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({username: name, email, password}),
  })

  if (!response.ok) {
    if (response.status === 409) {
      throw new Error('Email already exists')
    }
    // For registration, we don't want to trigger logout on other errors since user isn't logged in yet
    throw new Error(`Registration failed: ${response.status}`)
  }

  return response.json()
}

/**
 * Get the current authenticated user's information
 * @returns {Promise<Object>} - User information
 */
export const getCurrentUser = async () => {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: {
      ...getAuthHeaders(),
    },
  })

  await handleApiResponse(response, 'getCurrentUser')
  const userData = await response.json()

  // Transform the response to match expected format
  return {
    id: userData.id,
    name: userData.name,
    email: userData.email,
    created_at: userData.created_at,
    is_active: userData.is_active,
    is_admin: userData.is_admin,
  }
}

/**
 * Logout the current user
 */
export const logout = async () => {
  // In a real app, you might want to invalidate the token on the server
  // Here we'll just remove it from localStorage
  localStorage.removeItem('auth_token')
  localStorage.removeItem('auth_expires_at')

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300))

  return true
}

// Add authentication headers to existing API calls
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token')
  return token ? {Authorization: `Bearer ${token}`} : {}
}

/**
 * Thread Management Services
 */

/**
 * Get all threads for the current user
 * @returns {Promise<Array<{id: string, title: string, created_at: string}>>} - List of threads with their IDs
 */
export const getThreads = async () => {
  const response = await fetch(`${API_URL}/threads`, {
    headers: {
      ...getAuthHeaders(),
    },
  })
  await handleApiResponse(response, 'getThreads')
  return response.json()
}

/**
 * Get thread previews with last message content and timestamp
 * @returns {Promise<Array<{id: string, title: string, last_message_content: string, last_message_timestamp: string}>>} - List of thread previews
 */
export const getThreadPreviews = async () => {
  const response = await fetch(`${API_URL}/threads/previews`, {
    headers: {
      ...getAuthHeaders(),
    },
  })
  await handleApiResponse(response, 'getThreadPreviews')
  return response.json()
}

/**
 * Create a new thread
 * @param {string} title - Title for the new thread
 * @returns {Promise<{id: string, title: string, created_at: string}>} - The created thread with its new ID
 */
export const createThread = async title => {
  const response = await fetch(`${API_URL}/threads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({title}),
  })
  await handleApiResponse(response, 'createThread')
  return response.json()
}

/**
 * Get details for a specific thread
 * @param {string} threadId - The unique identifier of the thread
 * @returns {Promise<{id: string, title: string, created_at: string}>} - Thread details
 */
export const getThread = async threadId => {
  if (!threadId) {
    throw new Error('Thread ID is required')
  }
  const response = await fetch(`${API_URL}/threads/${threadId}`, {
    headers: {
      ...getAuthHeaders(),
    },
  })
  await handleApiResponse(response, 'getThread')
  return response.json()
}

/**
 * Get all messages for a specific thread
 * @param {string} threadId - The unique identifier of the thread
 * @returns {Promise<Array<{id: string, content: string, role: string, created_at: string}>>} - List of messages
 */
export const getThreadMessages = async threadId => {
  if (!threadId) {
    throw new Error('Thread ID is required')
  }
  const response = await fetch(`${API_URL}/threads/${threadId}/messages`, {
    headers: {
      ...getAuthHeaders(),
    },
  })
  await handleApiResponse(response, 'getThreadMessages')
  return response.json()
}

/**
 * Delete a thread
 * @param {string} threadId - The unique identifier of the thread to delete
 * @returns {Promise<{id: string, deleted: boolean}>} - Result of the deletion
 */
export const deleteThread = async threadId => {
  if (!threadId) {
    throw new Error('Thread ID is required')
  }
  const response = await fetch(`${API_URL}/threads/${threadId}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
    },
  })
  await handleApiResponse(response, 'deleteThread')
  return response.json()
}

/**
 * Update a thread's title
 * @param {string} threadId - The unique identifier of the thread to update
 * @param {string} newTitle - New title for the thread
 * @returns {Promise<{id: string, title: string, created_at: string}>} - The updated thread
 */
export const updateThread = async (threadId, newTitle) => {
  if (!threadId) {
    throw new Error('Thread ID is required')
  }
  if (!newTitle) {
    throw new Error('New title is required')
  }
  const response = await fetch(`${API_URL}/threads/${threadId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({title: newTitle}),
  })
  await handleApiResponse(response, 'updateThread')
  const data = await response.json()
  return {
    id: data.thread_id || data.id,
    title: data.title,
    created_at: data.created_at,
  }
}

/**
 * Clear all messages in a thread
 * @param {string} threadId - The ID of the thread to clear messages from
 * @returns {Promise<void>}
 */
export const clearThreadMessages = async threadId => {
  const response = await fetch(`${API_URL}/threads/${threadId}/messages`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  })

  await handleApiResponse(response, 'clearThreadMessages')
}
