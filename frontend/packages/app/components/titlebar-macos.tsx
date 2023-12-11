import {TitleBarProps} from '@mintter/app/components/titlebar'
import {TitlebarWrapper, View, XStack} from '@mintter/ui'
import {
  NavMenuButton,
  NavigationButtons,
  PageActionButtons,
  PageContextControl,
} from './titlebar-common'
import {Title} from './titlebar-title'

export default function TitleBarMacos(props: TitleBarProps) {
  if (props.clean) {
    return <TitlebarWrapper />
  }

  return (
    <TitlebarWrapper>
      <XStack
        paddingRight="$2"
        justifyContent="space-between"
        className="window-drag"
      >
        <XStack
          minWidth={'min-content'}
          flexBasis={0}
          alignItems="center"
          className="window-drag"
        >
          <XStack
            flex={1}
            paddingHorizontal={0}
            alignItems="flex-start"
            className="window-drag"
            gap="$2"
          >
            <NavMenuButton
              left={
                <View
                  width={72} // this width to stay away from the macOS window traffic lights
                />
              }
            />
            <NavigationButtons />
            <PageContextControl {...props} />
          </XStack>
        </XStack>
        <XStack flex={1} alignItems="center">
          <Title />
        </XStack>
        <XStack
          className="window-drag"
          justifyContent="flex-end"
          minWidth={'min-content'}
          flexBasis={0}
          alignItems="center"
        >
          <XStack className="no-window-drag">
            <PageActionButtons {...props} />
          </XStack>
        </XStack>
      </XStack>
    </TitlebarWrapper>
  )
}
