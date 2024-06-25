import {AppPlatform, useAppContext} from '@/app-context'
import {lazy} from 'react'

var ErrorBarMacos = lazy(() => import('./error-bar-macos'))
var ErrorBarWindowsLinux = lazy(() => import('./error-bar-windows-linux'))

export type ErrorBarProps = {
  isSidebarLocked: boolean
}

export function ErrorBar(props: ErrorBarProps) {
  const {platform} = useAppContext()
  let Component = getErrorBar(platform)
  return <Component {...props} />
}

function getErrorBar(platform: AppPlatform) {
  // return ErrorBarWindowsLinux // to test from macOS
  switch (platform) {
    case 'win32':
    case 'linux':
      return ErrorBarWindowsLinux
    case 'darwin':
      return ErrorBarMacos
    default:
      console.warn(`ErrorBar: unsupported platform: ${platform}`)
      return ErrorBarMacos
  }
}
