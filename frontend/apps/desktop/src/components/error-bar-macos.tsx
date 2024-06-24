import { TitlebarWrapper, XStack } from '@shm/ui'
import { AlertCircle } from '@tamagui/lucide-icons'
import { ErrorBarProps } from './error-bar'
import { NavMenuButton, NavigationButtons } from './titlebar-common'

export default function ErrorBar({ isSidebarLocked }: ErrorBarProps) {
  return (
    <TitlebarWrapper>
      <XStack jc="space-between">
        <XStack
          paddingLeft={isSidebarLocked ? 0 : 72}
          gap="$2"
          alignItems="center"
        >
          <NavMenuButton />
          <NavigationButtons />
        </XStack>
        <XStack f={1} jc="center" alignItems="center">
          <AlertCircle size="$1" color="$red10" />
        </XStack>
      </XStack>
    </TitlebarWrapper>
  )
}
