import {StyleProvider} from '@mintter/app/app-context'
import {FindInPage} from '@mintter/app/pages/find-in-page'
import {useStream} from '@mintter/ui'
import '@tamagui/core/reset.css'
import '@tamagui/font-inter/css/400.css'
import '@tamagui/font-inter/css/700.css'
import React, {useMemo} from 'react'
import ReactDOM from 'react-dom/client'
import {createIPC} from './ipc'
import './root.css'

function FindInPageView() {
  const ipc = useMemo(() => createIPC(), [])
  const darkMode = useStream<boolean>(window.darkMode)
  return (
    <div
      className={
        // this is used by editor.css which doesn't know tamagui styles, boooo!
        darkMode ? 'mintter-app-dark' : 'mintter-app-light'
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
