import {useWindowUtils} from '@/app-context'
import {Button, Close, XStack, useTheme} from '@shm/ui'

export function CloseButton() {
  const {close} = useWindowUtils()
  return (
    <ButtonWrapper
      aria-label="close"
      tabIndex={-1}
      onPress={() => close()}
      color="$color"
      icon={Close}
    />
  )
}

export function MaximizeOrRestoreButton() {
  const {isMaximized, maximize, unmaximize} = useWindowUtils()
  const theme = useTheme()

  if (isMaximized === undefined) return null

  let name: string
  let path: string
  let cb

  if (isMaximized) {
    name = 'restore'
    path =
      'm 2,1e-5 0,2 -2,0 0,8 8,0 0,-2 2,0 0,-8 z m 1,1 6,0 0,6 -1,0 0,-5 -5,0 z m -2,2 6,0 0,6 -6,0 z'
    cb = () => {
      unmaximize()
    }
  } else {
    name = 'maximize'
    path = 'M 0,0 0,10 10,10 10,0 Z M 1,1 9,1 9,9 1,9 Z'
    cb = () => {
      maximize()
    }
  }

  const title = name[0].toUpperCase() + name.substring(1)

  return (
    <ButtonWrapper
      aria-label={name}
      title={title}
      tabIndex={-1}
      onPress={cb}
      color="red"
      icon={
        <svg
          aria-hidden="true"
          version="1.1"
          viewBox="0 0 10 10"
          width={10}
          height={10}
        >
          <path fill={theme.color.variable} d={path} />
        </svg>
      }
    />
  )
}

export function MinimizeButton() {
  const {minimize} = useWindowUtils()
  const theme = useTheme()

  return (
    <ButtonWrapper
      aria-label="minize"
      tabIndex={-1}
      onPress={() => minimize()}
      icon={
        <svg aria-hidden="true" viewBox="0 0 10 10" width={10} height={10}>
          <path fill={theme.color.variable} d="M 0,5 10,5 10,6 0,6 Z" />
        </svg>
      }
    />
  )
}

function ButtonWrapper(props: any) {
  return (
    <Button
      size="$1"
      chromeless
      color="$color"
      width={20}
      height={20}
      {...props}
    />
  )
}

export function WindowsLinuxWindowControls() {
  return (
    <XStack className="no-window-drag">
      <MinimizeButton />
      <MaximizeOrRestoreButton />
      <CloseButton />
    </XStack>
  )
}
