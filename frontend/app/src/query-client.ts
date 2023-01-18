import {QueryClient} from '@tanstack/react-query'

export const appQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'always',
      useErrorBoundary: true,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      retryOnMount: false,
      staleTime: Infinity,
      refetchOnReconnect: false,
      onError: (err) => {
        console.log(`Query error: ${err}`)
      },
      retry: 4,
      retryDelay: (attempt) =>
        Math.min(attempt > 1 ? 2 ** attempt * 1000 : 1000, 30 * 1000),
      keepPreviousData: true,
    },
  },
})
