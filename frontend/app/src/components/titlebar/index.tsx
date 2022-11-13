import {lazy} from 'react'
import '../../styles/titlebar.scss'

var TitleBarMacos = lazy(() => import('./macos'))
var TitleBarWindows = lazy(() => import('./windows'))
var TitleBarLinux = lazy(() => import('./linux'))

export interface TitleBarProps {
  clean?: boolean
}

export function TitleBar(props: TitleBarProps) {

  if (import.meta.env.MODE == 'production') {
    if (import.meta.env.TAURI_PLATFORM == 'macos')
      return <TitleBarMacos {...props} />

    if (import.meta.env.TAURI_PLATFORM == 'windows')
      return <TitleBarWindows {...props} />

    if (import.meta.env.TAURI_PLATFORM == 'linux')
      return <TitleBarLinux {...props} />
  } else {
    if (window.Cypress) {
      if (window.Cypress.env('TAURI_PLATFORM') == 'macos')
        return <TitleBarMacos {...props} />

      if (window.Cypress.env('TAURI_PLATFORM') == 'windows')
        return <TitleBarWindows {...props} />

      if (window.Cypress.env('TAURI_PLATFORM') == 'linux')
        return <TitleBarLinux {...props} />
    }
  }

  throw new Error('unsupported platform')
}
