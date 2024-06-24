import {XStack} from '@shm/ui'
import {AlertCircle} from '@tamagui/lucide-icons'
import {NavMenuButton, NavigationButtons} from './titlebar-common'
import {WindowsLinuxTitleBar} from './windows-linux-titlebar'

export default function ErrorBarWindowsLinux() {
  return (
    <WindowsLinuxTitleBar
      left={
        <XStack paddingHorizontal={0} paddingVertical="$2" space="$2">
          <NavMenuButton />
          <NavigationButtons />
        </XStack>
      }
      title={
        <XStack f={1} jc="center" alignItems="center">
          <AlertCircle size="$1" color="$red10" />
        </XStack>
      }
    />
  )
}
