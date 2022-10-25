import '../../styles/titlebar.scss'
import {TitleBarLinux} from './linux'
import {TitleBarMacos} from './macos'
import {TitleBarWindows} from './windows'

export function TitleBar() {
  if (import.meta.env.TAURI_PLATFORM == 'macos') return <TitleBarMacos />
  if (import.meta.env.TAURI_PLATFORM == 'windows') return <TitleBarWindows />
  if (import.meta.env.TAURI_PLATFORM == 'linux') return <TitleBarLinux />

  throw new Error('unsupported platform')
}
