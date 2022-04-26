import {useLibrary, useMainPage} from '@app/main-page-context'
import {css, styled} from '@app/stitches.config'
import {invoke} from '@tauri-apps/api'
import {getCurrent} from '@tauri-apps/api/window'
import {useActor} from '@xstate/react'
import {useCallback} from 'react'
import {Box} from './box'
import {Button} from './button'
import {Icon} from './icon'
import {useSidepanel} from './sidepanel'
import {Tooltip} from './tooltip'

const draggableProps = {
  'data-tauri-drag-region': true,
}

export const TopbarStyled = styled(Box, {
  gridArea: 'topbar',
  width: '$full',
  height: 40,
  display: 'flex',
  borderBottom: '1px solid rgba(0,0,0,0.1)',
  background: '$background-alt',
})

export const topbarSection = css({
  height: '$full',
  display: 'flex',
  alignItems: 'center',
})

function maximize() {
  const win = getCurrent()
  win.maximize()
}

export function Topbar() {
  return (
    <TopbarStyled data-tauri-drag-region style={{userSelect: 'none', cursor: 'grab'}}>
      <SidenavBar />
      <MainBar />
      <TopbarActions />
    </TopbarStyled>
  )
}

function SidenavBar() {
  const libraryService = useLibrary()

  const toggle = useCallback(() => libraryService.send('LIBRARY.TOGGLE'), [libraryService])
  return (
    <Box
      {...draggableProps}
      className={topbarSection()}
      data-tauri-drag-region
      css={{
        width: 232,
        display: 'flex',
        alignItems: 'center',
        // justifyContent: 'space-between',
        paddingLeft: '$5',
        paddingRight: '$3',
      }}
    >
      <span style={{display: 'block', flex: 'none', width: 60}} />
      <Box css={{display: 'flex', alignItems: 'center', gap: '$4'}}>
        <Button variant="ghost" size="0" color="muted" onClick={toggle}>
          <Icon name="Sidenav" size="2" />
        </Button>
        <TopbarNavigation />
      </Box>
    </Box>
  )
}

function MainBar() {
  return (
    <Box
      {...draggableProps}
      className={topbarSection()}
      data-tauri-drag-region
      css={{
        paddingLeft: '$5',
        paddingRight: '$3',
        pointerEvents: 'all',
        flex: 1,
        display: 'flex',
        gap: '$5',
      }}
    >
      {window?.location?.pathname}
    </Box>
  )
}

function TopbarNavigation() {
  let mainPageService = useMainPage()
  return (
    <Box css={{display: 'flex'}} {...draggableProps}>
      <Button
        size="0"
        variant="ghost"
        color="muted"
        onClick={(e) => {
          e.preventDefault()
          window.history.back()
        }}
      >
        <Icon name="ArrowChevronLeft" color="muted" />
      </Button>
      <Button
        size="0"
        variant="ghost"
        color="muted"
        onClick={(e) => {
          e.preventDefault()
          window.history.forward()
        }}
      >
        <Icon name="ArrowChevronRight" color="muted" />
      </Button>
    </Box>
  )
}

function TopbarActions() {
  const service = useSidepanel()
  let mainPage = useMainPage()
  let [mainState] = useActor(mainPage)

  function toggleSidepanel() {
    service.send('SIDEPANEL.TOGGLE')
  }

  async function onCreateDraft() {
    await invoke('open_in_new_window', {url: '/new'})
  }
  return (
    <Box
      {...draggableProps}
      className={topbarSection()}
      data-tauri-drag-region
      css={{
        flex: 'none',
        paddingLeft: '$7',
        paddingRight: '$4',
        pointerEvents: 'all',
        display: 'flex',
        gap: '$4',
      }}
    >
      {mainState.hasTag('sidepanel') && (
        <Tooltip content="Toogle Sidepanel">
          <Button size="0" variant="ghost" color="muted" onClick={toggleSidepanel}>
            <Icon name="Sidepanel" size="2" color="muted" />
          </Button>
        </Tooltip>
      )}
      <Button size="0" variant="ghost" color="muted" onClick={onCreateDraft}>
        <Icon name="Add" color="muted" />
      </Button>
    </Box>
  )
}
