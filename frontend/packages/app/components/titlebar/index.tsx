import {AppPlatform, useAppContext} from '@mintter/app/app-context'
import {TitlebarWrapper} from '@mintter/ui'
import {Suspense, lazy, useMemo} from 'react'

var TitleBarMacos = lazy(() => import('./macos'))
var TitleBarWindows = lazy(() => import('./windows'))
var TitleBarLinux = lazy(() => import('./linux'))

export interface TitleBarProps {
  clean?: boolean
  isMacOS?: boolean
}

export function TitleBar(props: TitleBarProps) {
  const {platform} = useAppContext()
  let Component = useMemo(() => getComponent(platform), [platform])
  return (
    <Suspense fallback={<TitlebarWrapper />}>
      <Component {...props} />
    </Suspense>
  )
}

function getComponent(platform: AppPlatform) {
  switch (platform) {
    case 'win32':
      return TitleBarWindows
    case 'linux':
      return TitleBarLinux
    case 'darwin':
      return TitleBarMacos
    default:
      console.warn(`Titlebar: unsupported platform: ${platform}`)
      return TitleBarMacos
  }
}
