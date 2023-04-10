import {getCurrent} from '@tauri-apps/api/window'
import {useEffect, useState} from 'react'
import {Button} from '@mintter/ui'

export function CloseButton() {
  const win = getCurrent()
  return (
    <ButtonWrapper aria-label="close" tabIndex={-1} onPress={() => win.close()}>
      <svg
        aria-hidden="true"
        version="1.1"
        viewBox="0 0 10 10"
        width={10}
        height={10}
      >
        <path d="M 0,0 0,0.7 4.3,5 0,9.3 0,10 0.7,10 5,5.7 9.3,10 10,10 10,9.3 5.7,5 10,0.7 10,0 9.3,0 5,4.3 0.7,0 Z" />
      </svg>
    </ButtonWrapper>
  )
}

export function MaximizeOrRestoreButton() {
  const win = getCurrent()

  const [isMaximized, setIsMaximized] = useState<boolean | undefined>()
  useEffect(() => {
    win.isMaximized().then((v) => setIsMaximized(v))
  })

  if (typeof isMaximized == 'undefined') return null

  let name: string
  let path: string
  let cb

  if (isMaximized) {
    name = 'restore'
    path =
      'm 2,1e-5 0,2 -2,0 0,8 8,0 0,-2 2,0 0,-8 z m 1,1 6,0 0,6 -1,0 0,-5 -5,0 z m -2,2 6,0 0,6 -6,0 z'
    cb = () => {
      win.unmaximize()
      setIsMaximized(false)
    }
  } else {
    name = 'maximize'
    path = 'M 0,0 0,10 10,10 10,0 Z M 1,1 9,1 9,9 1,9 Z'
    cb = () => {
      win.maximize()
      setIsMaximized(true)
    }
  }

  const title = name[0].toUpperCase() + name.substring(1)

  return (
    <ButtonWrapper aria-label={name} title={title} tabIndex={-1} onPress={cb}>
      <svg
        aria-hidden="true"
        version="1.1"
        viewBox="0 0 10 10"
        width={10}
        height={10}
      >
        <path d={path} />
      </svg>
    </ButtonWrapper>
  )
}

export function MinimizeButton() {
  const win = getCurrent()

  return (
    <ButtonWrapper
      aria-label="minize"
      tabIndex={-1}
      onPress={() => win.minimize()}
    >
      <svg aria-hidden="true" viewBox="0 0 10 10" width={10} height={10}>
        <path d="M 0,5 10,5 10,6 0,6 Z" />
      </svg>
    </ButtonWrapper>
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
