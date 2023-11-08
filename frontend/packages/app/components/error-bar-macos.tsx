import {TitlebarWrapper, XStack} from '@mintter/ui'
import {AlertCircle} from '@tamagui/lucide-icons'
import {NavMenuButton, NavigationButtons} from './titlebar-common'

export default function ErrorBar() {
  return (
    <TitlebarWrapper>
      <XStack paddingHorizontal="$2" jc="space-between">
        <XStack paddingLeft={72} gap="$2" alignItems="center">
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
