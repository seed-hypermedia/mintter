import { TitleText, TitlebarWrapper, View, XStack } from '@shm/ui'
import { TitleBarProps } from './titlebar'
import {
  NavMenuButton,
  NavigationButtons,
  PageActionButtons,
} from './titlebar-common'
import { Title } from './titlebar-title'

export default function TitleBarMacos(props: TitleBarProps) {
  if (props.clean) {
    return (
      <TitlebarWrapper>
        <XStack>
          <View
            width={72} // this width to stay away from the macOS window traffic lights
          />
          <TitleText marginHorizontal="$4" fontWeight="bold">
            {props.cleanTitle}
          </TitleText>
        </XStack>
      </TitlebarWrapper>
    )
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
          <PageActionButtons {...props} />
        </XStack>
      </XStack>
    </TitlebarWrapper>
  )
}
