import '@testing-library/jest-dom'
import {cleanup} from '@testing-library/react'
import {vi} from 'vitest'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
