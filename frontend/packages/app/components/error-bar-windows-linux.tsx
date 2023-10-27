import {XStack} from '@mintter/ui'
import {AlertCircle} from '@tamagui/lucide-icons'
import {WindowsLinuxTitleBar} from './titlebar-windows-linux'
import {NavMenu, NavigationButtons} from './titlebar-common'

export default function ErrorBarWindowsLinux() {
  return (
    <WindowsLinuxTitleBar
      left={
        <XStack paddingHorizontal={0} paddingVertical="$2" space="$2">
          <NavMenu />
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
