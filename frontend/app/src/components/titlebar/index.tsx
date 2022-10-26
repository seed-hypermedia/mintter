import '../../styles/titlebar.scss'
import {TitleBarLinux} from './linux'
import {TitleBarMacos} from './macos'
import {TitleBarWindows} from './windows'

interface TitleBarProps {
  settings?: boolean
}

var platform = {
  macos: TitleBarMacos,
  windows: TitleBarWindows,
  linux: TitleBarLinux,
}

export function TitleBar(props: TitleBarProps) {
  let os: 'macos' | 'windows' | 'linux' = import.meta.env.TAURI_PLATFORM
  let Component = platform[os]

  if (!Component) throw new Error('unsupported platform')

  return <Component {...props} />
}
