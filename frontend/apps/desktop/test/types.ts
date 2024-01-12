import {startApp} from './utils'

export enum LocatorStrategy {
  id = 'id',
  xpath = 'xpath',
  role = 'role',
  altText = 'altText',
  text = 'text',
  placeholder = 'placeholder',
}

export type AppData = Awaited<ReturnType<typeof startApp>>

type Architecture = 'x64' | 'x32' | 'arm64'
export interface ElectronAppInfo {
  /** Path to the app's executable file */
  executable: string
  /** Path to the app's main (JS) file */
  main: string
  /** Name of the app */
  name: string
  /** Resources directory */
  resourcesDir: string
  /** True if the app is using asar */
  asar: boolean
  /** OS platform */
  platform: 'darwin' | 'win32' | 'linux'
  arch: Architecture
}
