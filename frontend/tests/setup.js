import { afterEach, vi} from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'


beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// runs a clean after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
})