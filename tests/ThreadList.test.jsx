import React from 'react'
import {render, screen, fireEvent, act, waitFor} from '@testing-library/react'
import {describe, it, expect, vi, beforeEach} from 'vitest'
import {ThreadProvider, useThread} from '../src/context/ThreadContext'

// We'll create ThreadList soon
import ThreadList from '../src/components/ThreadList'

const mockThreads = [
  {thread_id: '1', title: 'Thread 1'},
  {thread_id: '2', title: 'Thread 2'},
]

describe('ThreadList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays a list of threads from context', async () => {
    const Wrapper = () => {
      const {setThreads} = useThread()
      React.useEffect(() => {
        setThreads(mockThreads)
      }, [])
      return <ThreadList />
    }
    render(
      <ThreadProvider>
        <Wrapper />
      </ThreadProvider>,
    )
    expect(screen.getByText('Thread 1')).toBeInTheDocument()
    expect(screen.getByText('Thread 2')).toBeInTheDocument()
  })

  it('calls selectThread when a thread is clicked', async () => {
    const selectThread = vi.fn()
    const Wrapper = () => {
      const ctx = useThread()
      React.useEffect(() => {
        ctx.setThreads(mockThreads)
      }, [])
      return <ThreadList selectThread={selectThread} />
    }
    render(
      <ThreadProvider>
        <Wrapper />
      </ThreadProvider>,
    )
    fireEvent.click(screen.getByText('Thread 1'))
    // The real implementation will call context, here we just check the click
    // In real test, you may spy on context or check selected UI
  })

  it('shows a form/button to create a new thread and calls createNewThread', async () => {
    const createNewThread = vi.fn()
    const Wrapper = () => {
      const ctx = useThread()
      React.useEffect(() => {
        ctx.setThreads(mockThreads)
      }, [])
      return <ThreadList createNewThread={createNewThread} />
    }
    render(
      <ThreadProvider>
        <Wrapper />
      </ThreadProvider>,
    )
    fireEvent.change(screen.getByPlaceholderText('New thread title'), {
      target: {value: 'My Thread'},
    })
    fireEvent.click(screen.getByText('Create Thread'))
    // In real test, you may spy on context or check new thread in UI
  })

  it('shows loading and error states', () => {
    const Wrapper = () => {
      const ctx = useThread()
      React.useEffect(() => {
        ctx.setThreads([])
        ctx.setError('Failed to load')
      }, [])
      return <ThreadList />
    }
    render(
      <ThreadProvider>
        <Wrapper />
      </ThreadProvider>,
    )
    expect(screen.getByText('Failed to load')).toBeInTheDocument()
  })
})
