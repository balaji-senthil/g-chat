import React from 'react'
import {render} from '@testing-library/react'
import {describe, it, expect, vi} from 'vitest'
import ModelSelector from '../src/components/ModelSelector'

// Mock Material-UI components
vi.mock('@mui/material', () => ({
  Select: () => <div data-testid="mui-select">Select Mock</div>,
  MenuItem: () => <div data-testid="mui-menu-item">MenuItem Mock</div>,
  FormControl: ({children}) => (
    <div data-testid="mui-form-control">{children}</div>
  ),
  InputLabel: () => <div data-testid="mui-input-label">InputLabel Mock</div>,
  Box: ({children}) => <div data-testid="mui-box">{children}</div>,
}))

// Mock apiService
vi.mock('../src/services/apiService', () => ({
  config: {
    API_URL: 'http://test-api.com/api',
    ENABLE_MODEL_SELECTION: true,
  },
}))

// Mock global fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  }),
)

// Mock window.alert
global.alert = vi.fn()

describe('ModelSelector Component', () => {
  it('renders the component', () => {
    const {container} = render(
      <ModelSelector currentModel="test-model" onModelChange={() => {}} />,
    )
    expect(container).not.toBeEmptyDOMElement()
  })
})
