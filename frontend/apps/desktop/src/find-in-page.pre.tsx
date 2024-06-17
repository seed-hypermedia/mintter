import {Spinner, YStack} from '@shm/ui'
import '@tamagui/core/reset.css'
import '@tamagui/font-inter/css/400.css'
import '@tamagui/font-inter/css/700.css'
import React, {Suspense, useDeferredValue, useEffect, useState} from 'react'
import ReactDOM from 'react-dom/client'
import {ErrorBoundary} from 'react-error-boundary'
import './root.css'
// import {trpc} from './trpc'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FindInPageView />
  </React.StrictMode>,
)

function FindInPageView() {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  useEffect(() => {
    if (deferredQuery.length > 3) {
      window.ipc?.send('find_in_page_query', {
        query: deferredQuery,
        findNext: true,
      })
    }
  }, [deferredQuery])

  return (
    <Suspense
      fallback={
        <YStack fullscreen ai="center" jc="center">
          <Spinner />
        </YStack>
      }
    >
      <ErrorBoundary
        FallbackComponent={FindInPageViewError}
        onReset={() => {
          window.location.reload()
        }}
      >
        <div>
          <input placeholder="find in page" />
          <button
            onClick={() => {
              window.ipc?.send('')
            }}
          >
            Find in page
          </button>
        </div>
      </ErrorBoundary>
    </Suspense>
  )
}

function FindInPageViewError() {
  return <div>ERROR :(</div>
}
