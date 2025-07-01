import React from 'react'
import {render} from '@testing-library/react'
import {describe, it, expect, vi} from 'vitest'
import RateLimitIndicator from '../src/components/RateLimitIndicator'

// Mock Material-UI components
vi.mock('@mui/material', () => ({
  CircularProgress: () => (
    <div data-testid="mui-circular-progress">Loading...</div>
  ),
  LinearProgress: () => <div data-testid="mui-linear-progress">Progress</div>,
  Typography: ({children}) => (
    <div data-testid="mui-typography">{children}</div>
  ),
  Tooltip: ({children}) => <div data-testid="mui-tooltip">{children}</div>,
  Box: ({children}) => <div data-testid="mui-box">{children}</div>,
}))

// Mock apiService
vi.mock('../src/services/apiService', () => ({
  config: {
    API_URL: 'http://test-api.com/api',
  },
}))

// Mock global fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        requests: {
          limit: 60,
          used: 15,
          remaining: 45,
          reset_after_seconds: 30,
        },
        tokens: {
          limit: 60000,
          used: 12000,
          remaining: 48000,
          reset_after_seconds: 30,
        },
      }),
  }),
)

describe('RateLimitIndicator Component', () => {
  it('renders the component', () => {
    const {container} = render(<RateLimitIndicator />)
    expect(container).not.toBeEmptyDOMElement()
  })
})
