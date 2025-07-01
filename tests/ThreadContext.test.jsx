import React from 'react'
import {render, screen, act, waitFor, fireEvent} from '@testing-library/react'
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
// We'll create ThreadProvider and useThread soon
import {ThreadProvider, useThread} from '../src/context/ThreadContext'
import * as apiService from '../src/services/apiService'

// Mock the apiService thread functions
vi.mock('../src/services/apiService', () => ({
  getThreads: vi.fn(),
  createThread: vi.fn(),
  getThread: vi.fn(),
  getThreadMessages: vi.fn(),
}))

const mockThreads = [
  {thread_id: '1', title: 'Thread 1'},
  {thread_id: '2', title: 'Thread 2'},
]
const mockMessages = [
  {role: 'user', content: 'Hello'},
  {role: 'assistant', content: 'Hi!'},
]

const TestComponent = () => {
  const {
    threads,
    selectedThread,
    threadMessages,
    fetchThreads,
    createNewThread,
    selectThread,
    fetchThreadMessages,
    error,
  } = useThread()

  return (
    <div>
      <div data-testid="thread-count">{threads.length}</div>
      <div data-testid="selected-thread">{selectedThread?.title || ''}</div>
      <div data-testid="message-count">{threadMessages.length}</div>
      <div data-testid="error">{error || ''}</div>
      <button data-testid="fetch-threads" onClick={fetchThreads}>
        Fetch Threads
      </button>
      <button
        data-testid="create-thread"
        onClick={() => createNewThread('New Thread')}
      >
        Create Thread
      </button>
      <button
        data-testid="select-thread"
        onClick={() => selectThread(mockThreads[0])}
      >
        Select Thread
      </button>
      <button
        data-testid="fetch-messages"
        onClick={() => fetchThreadMessages('1')}
      >
        Fetch Messages
      </button>
    </div>
  )
}

describe('ThreadContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches and displays threads', async () => {
    apiService.getThreads.mockResolvedValueOnce(mockThreads)
    render(
      <ThreadProvider>
        <TestComponent />
      </ThreadProvider>,
    )
    await act(async () => {
      fireEvent.click(screen.getByTestId('fetch-threads'))
    })
    expect(screen.getByTestId('thread-count').textContent).toBe('2')
  })

  it('creates a new thread and adds it to the list', async () => {
    apiService.createThread.mockResolvedValueOnce({
      thread_id: '3',
      title: 'New Thread',
    })
    apiService.getThreads.mockResolvedValueOnce([
      ...mockThreads,
      {thread_id: '3', title: 'New Thread'},
    ])
    render(
      <ThreadProvider>
        <TestComponent />
      </ThreadProvider>,
    )
    await act(async () => {
      fireEvent.click(screen.getByTestId('create-thread'))
    })
    await waitFor(() => {
      expect(screen.getByTestId('thread-count').textContent).toBe('3')
    })
  })

  it('selects a thread', async () => {
    render(
      <ThreadProvider>
        <TestComponent />
      </ThreadProvider>,
    )
    await act(async () => {
      fireEvent.click(screen.getByTestId('select-thread'))
    })
    expect(screen.getByTestId('selected-thread').textContent).toBe('Thread 1')
  })

  it('fetches messages for a selected thread', async () => {
    apiService.getThreadMessages.mockResolvedValueOnce(mockMessages)
    render(
      <ThreadProvider>
        <TestComponent />
      </ThreadProvider>,
    )
    await act(async () => {
      fireEvent.click(screen.getByTestId('fetch-messages'))
    })
    expect(screen.getByTestId('message-count').textContent).toBe('2')
  })

  it('handles API errors gracefully', async () => {
    apiService.getThreads.mockRejectedValueOnce(new Error('API error'))
    render(
      <ThreadProvider>
        <TestComponent />
      </ThreadProvider>,
    )
    await act(async () => {
      fireEvent.click(screen.getByTestId('fetch-threads'))
    })
    expect(screen.getByTestId('error').textContent).toBe('API error')
  })
})
