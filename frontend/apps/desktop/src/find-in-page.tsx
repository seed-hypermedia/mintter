import {StyleProvider} from '@/app-context-provider'
import {useStream} from '@shm/ui'
import '@tamagui/core/reset.css'
import '@tamagui/font-inter/css/400.css'
import '@tamagui/font-inter/css/700.css'
import React, {useMemo} from 'react'
import ReactDOM from 'react-dom/client'
import {createIPC} from './ipc'
import {FindInPage} from './pages/find-in-page'

function FindInPageView() {
  const ipc = useMemo(() => createIPC(), [])
  // @ts-expect-error
  const darkMode = useStream<boolean>(window.darkMode)

  return (
    <div
      className={
        // this is used by editor.css which doesn't know tamagui styles, boooo!
        darkMode ? 'seed-app-dark' : 'seed-app-light'
      }
    >
      <StyleProvider darkMode={darkMode}>
        <FindInPage ipc={ipc} />
      </StyleProvider>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FindInPageView />
  </React.StrictMode>,
)
