import {
  CloseButton,
  WindowsLinuxWindowControls,
} from '@/components/window-controls'
import {
  TitleText,
  TitlebarRow,
  TitlebarSection,
  TitlebarWrapper,
  XStack,
} from '@shm/ui'
import {TitleBarProps} from './titlebar'
import {
  NavMenuButton,
  NavigationButtons,
  PageActionButtons,
} from './titlebar-common'
import {Title} from './titlebar-title'
import './titlebar-windows-linux.css'
import {SystemMenu} from './windows-linux-titlebar'

export default function TitleBarWindows(props: TitleBarProps) {
  if (props.clean) {
    return (
      <TitlebarWrapper style={{flex: 'none'}} className="window-drag">
        <TitlebarRow>
          <TitlebarSection f={1} paddingHorizontal="$4">
            <TitleText>{props.cleanTitle}</TitleText>
          </TitlebarSection>
          <TitlebarSection f={0} alignItems="center" justifyContent="flex-end">
            <XStack className="no-window-drag">
              <CloseButton />
            </XStack>
          </TitlebarSection>
        </TitlebarRow>
      </TitlebarWrapper>
    )
  }

  return (
    <WindowsLinuxTitleBar
      right={<PageActionButtons {...props} />}
      left={
        <XStack paddingHorizontal={0} paddingVertical="$2" space="$2">
          <NavMenuButton />
          <NavigationButtons />
        </XStack>
      }
      title={<Title />}
    />
  )
}

export function WindowsLinuxTitleBar({
  left,
  title,
  right,
}: {
  title: React.ReactNode
  left?: React.ReactNode
  right?: React.ReactNode
}) {
  return (
    <TitlebarWrapper className="window-drag" style={{flex: 'none'}}>
      <TitlebarRow minHeight={28} backgroundColor="$color3">
        <TitlebarSection>
          <SystemMenu />
        </TitlebarSection>
        <XStack flex={1} />
        <TitlebarSection space>
          <WindowsLinuxWindowControls />
        </TitlebarSection>
      </TitlebarRow>
      <TitlebarRow>
        <XStack
          flex={1}
          minWidth={'min-content'}
          flexBasis={0}
          alignItems="center"
          className="window-drag"
        >
          {left}
        </XStack>
        <XStack
          f={1}
          alignItems="center"
          justifyContent="center"
          pointerEvents="none"
          height="100%"
          ai="center"
          jc="center"
        >
          {title}
        </XStack>
        <XStack
          flex={1}
          justifyContent="flex-end"
          minWidth={'min-content'}
          flexBasis={0}
          className="window-drag"
          alignItems="center"
        >
          {right}
        </XStack>
      </TitlebarRow>
    </TitlebarWrapper>
  )
}
