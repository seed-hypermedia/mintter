import {ScrollView, View, XStack, YStackProps, useStream} from '@mintter/ui'
import {SidebarWidth, useSidebarContext} from '../src/sidebar-context'

export function MainWrapper({children, ...props}: YStackProps & {}) {
  const ctx = useSidebarContext()
  const isLocked = useStream(ctx.isLocked)
  const sidebarSpacing = isLocked ? SidebarWidth : 0
  return (
    <XStack flex={1} {...props}>
      <View style={{width: sidebarSpacing}} />
      {/* TODO: we cannot remove this ID here because the SlashMenu is referencing
      this! */}
      <ScrollView id="scroll-page-wrapper">{children}</ScrollView>
    </XStack>
  )
}
