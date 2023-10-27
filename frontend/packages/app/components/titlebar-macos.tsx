import {TitleBarProps} from '@mintter/app/components/titlebar'
import {TitlebarWrapper, XStack} from '@mintter/ui'
import {
  NavMenu,
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
        paddingHorizontal="$2"
        justifyContent="space-between"
        className="window-drag"
      >
        <XStack
          flex={1}
          minWidth={'min-content'}
          flexBasis={0}
          alignItems="center"
          className="window-drag"
        >
          <XStack
            flex={1}
            paddingLeft={72} // this width to stay away from the traffic lights
            alignItems="flex-start"
            className="window-drag"
            gap="$2"
          >
            <NavMenu />
            <NavigationButtons />
            <PageContextControl {...props} />
          </XStack>
        </XStack>
        <XStack flex={1} alignItems="center">
          <Title />
        </XStack>
        <XStack
          className="window-drag"
          flex={1}
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
