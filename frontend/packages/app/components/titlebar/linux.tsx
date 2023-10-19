import {useIPC} from '@mintter/app/app-context'
import {Dropdown} from '@mintter/app/components/dropdown'
import {TitleBarProps} from '@mintter/app/components/titlebar'
import {
  SizableText,
  TitlebarRow,
  TitlebarSection,
  TitlebarWrapper,
  XStack,
} from '@mintter/ui'
import {useEffect, useState} from 'react'
import {MintterIcon} from '../mintter-icon'
import {NavMenu, PageActionButtons, PageContextButtons} from './common'
import {Title} from './title'
import {
  CloseButton,
  MaximizeOrRestoreButton,
  MinimizeButton,
} from './window-controls'

export default function TitleBarLinux(props: TitleBarProps) {
  const [focus, setFocus] = useState(true)

  useEffect(() => {
    const focus = () => setFocus(true)
    const blur = () => setFocus(false)

    window.addEventListener('focus', focus)
    window.addEventListener('blur', blur)

    return () => {
      window.removeEventListener('focus', focus)
      window.removeEventListener('blur', blur)
    }
  }, [])

  // in the clean window we render a stripped down version of the titlebar
  if (props.clean) {
    return (
      <TitlebarWrapper
        className="window-drag"
        data-tauri-drag-region
        style={{flex: 'none'}}
      >
        <TitlebarRow data-tauri-drag-region>
          <TitlebarSection data-tauri-drag-region>
            <span data-tauri-drag-region>
              <SizableText>Mintter</SizableText>
            </span>
          </TitlebarSection>
          <TitlebarSection flex={1} alignItems="flex-end">
            <XStack className="no-window-drag" marginLeft="auto">
              <CloseButton />
            </XStack>
          </TitlebarSection>
        </TitlebarRow>
      </TitlebarWrapper>
    )
  }

  return (
    <TitlebarWrapper
      style={{flex: 'none'}}
      data-has-focus={focus}
      className="window-drag"
      data-tauri-drag-region
    >
      <TitlebarRow data-tauri-drag-region>
        <TitlebarSection data-tauri-drag-region>
          <XStack className="no-window-drag">
            <NavMenu />
            <PageContextButtons {...props} />
          </XStack>
        </TitlebarSection>
        <TitlebarSection flex={1}>
          <Title />
        </TitlebarSection>
        <TitlebarSection data-tauri-drag-region>
          <XStack className="no-window-drag">
            <PageActionButtons {...props} />
          </XStack>
          <XStack className="no-window-drag">
            <MinimizeButton />
            <MaximizeOrRestoreButton />
            <CloseButton />
          </XStack>
        </TitlebarSection>
      </TitlebarRow>
    </TitlebarWrapper>
  )
}

export interface MenuItemProps {
  title: string
  accelerator?: string
  disabled?: boolean
  onPress: () => void
  icon?: any
}

function MenuItem({accelerator, ...props}: MenuItemProps) {
  useEffect(() => {
    if (accelerator) {
      const keys = accelerator.split('+')

      window.addEventListener('keyup', (e) => {
        if (
          keys.every((k) => {
            if (k == 'Alt') return e.altKey
            if (k == 'Shift') return e.shiftKey
            if (k == 'Ctrl') return e.ctrlKey
            k == e.key
          })
        ) {
          console.log(`triggered acc ${accelerator}!`)
        }
      })
    }
  }, [accelerator])

  return (
    <Dropdown.Item
      iconAfter={
        accelerator ? (
          <SizableText size="$1" color="$mint5">
            {accelerator}
          </SizableText>
        ) : undefined
      }
      {...props}
    />
  )
}
