import '../../styles/titlebar.scss'
import {TitleBarLinux} from './linux'
import {TitleBarMacos} from './macos'
import {TitleBarWindows} from './windows'

interface TitleBarProps {
  settings?: boolean
}

export function TitleBar(props: TitleBarProps) {
  if (import.meta.env.TAURI_PLATFORM == 'macos')
    return <TitleBarMacos {...props} />

  if (import.meta.env.TAURI_PLATFORM == 'windows')
    return <TitleBarWindows {...props} />

  if (import.meta.env.TAURI_PLATFORM == 'linux')
    return <TitleBarLinux {...props} />

  throw new Error('unsupported platform')
}
