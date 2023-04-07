import {XStack, YStack} from '@mintter/ui'

const isMac = import.meta.env.TAURI_PLATFORM == 'macos'

export function Titlebar({children}: {children?: React.ReactNode}) {
  return (
    <YStack
      width={'100%'}
      top={0}
      zIndex={99999}
      paddingLeft={isMac ? 74 : 0}
      // @ts-ignore tamagui doesnt allow fixed.. but it works and is needed
      position="fixed"
      minHeight={40}
      data-tauri-drag-region
    >
      {children}
    </YStack>
  )
}

export function TitlebarRow({children}: {children: React.ReactNode}) {
  return <XStack data-tauri-drag-region>{children}</XStack>
}

export function TitlebarSection({children}: {children: React.ReactNode}) {
  return <XStack data-tauri-drag-region>{children}</XStack>
}
