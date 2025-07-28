import '@testing-library/jest-dom'

// Set NODE_ENV for tests
process.env.NODE_ENV = 'test'

// Extend Vitest's expect with jest-dom matchers
import { expect } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)