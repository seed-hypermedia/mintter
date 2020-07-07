import '@testing-library/jest-dom/extend-expect'

import {queryCache} from 'react-query'

// make debug output for TestingLibrary Errors larger
process.env.DEBUG_PRINT_LIMIT = 15000

// real times is a good default to start, individual tests can
// enable fake timers if they need.
beforeEach(() => jest.useRealTimers())

// general cleanup
afterEach(() => {
  queryCache.clear()
})
