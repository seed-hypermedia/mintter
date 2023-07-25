import {lazy} from 'react'
import {useAppContext} from '@mintter/app/src/app-context'

var TitleBarMacos = lazy(() => import('./macos'))
var TitleBarWindows = lazy(() => import('./windows'))
var TitleBarLinux = lazy(() => import('./linux'))

export interface TitleBarProps {
  clean?: boolean
}

export function TitleBar(props: TitleBarProps) {
  const {platform} = useAppContext()
  if (platform == 'macos') return <TitleBarMacos {...props} />
  if (platform == 'windows') return <TitleBarWindows {...props} />
  if (platform == 'linux') return <TitleBarLinux {...props} />
  console.warn(`Titlebar: unsupported platform: ${platform}`)
  return <TitleBarMacos {...props} />
}
