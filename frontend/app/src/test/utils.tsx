import {QueryClient} from 'react-query'
;(function mockTauriIpc() {
  if (window) {
    window.__TAURI_IPC__ = function mockTAURI_IPC() {
      // noob
    }
  }
})()

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        retry: false,
        retryOnMount: false,
        staleTime: Infinity,
      },
    },
  })
}
