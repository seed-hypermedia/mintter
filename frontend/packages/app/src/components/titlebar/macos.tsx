import {TitleBarProps} from '@mintter/app/src/components/titlebar'
import {PageActionButtons, NavMenu, PageContextButtons} from './common'
import {Title} from './title'
import {TitlebarWrapper, XStack} from '@mintter/ui'

export default function TitleBarMacos(props: TitleBarProps) {
  if (props.clean) {
    return <TitlebarWrapper className="window-drag" />
  }

  return (
    <TitlebarWrapper className="window-drag">
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
          {/* TODO: not sure why we are using Container here */}
          <XStack
            flex={1}
            paddingLeft={72}
            alignItems="flex-start"
            className="window-drag"
          >
            <XStack className="no-window-drag">
              <NavMenu />
              <PageContextButtons {...props} />
            </XStack>
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
