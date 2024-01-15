export type WindowUtils = {
  maximize: () => void
  unmaximize: () => void
  close: () => void
  minimize: () => void
  hide: () => void
  isMaximized: boolean | undefined
  quit: () => void
}
