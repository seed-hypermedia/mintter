import {MINTTER_LINK_PREFIX} from '@app/constants'
import {Dropdown} from '@app/editor/dropdown'
import {useAccount} from '@app/hooks'
import {useMainPage, usePageTitle} from '@app/main-page-context'
import {css, styled} from '@app/stitches.config'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {debug, error} from '@app/utils/logger'
import {useBookmarksService} from '@components/bookmarks'
import {Text} from '@components/text'
import {useActor} from '@xstate/react'
import toast from 'react-hot-toast'
import {Box} from './box'
import {Icon} from './icon'

const draggableProps = {
  'data-tauri-drag-region': true,
}

export const TopbarStyled = styled(Box, {
  gridArea: 'topbar',
  width: '$full',
  height: 40,
  display: 'flex',
  borderBottom: '1px solid $colors$base-border-subtle',
  background: '$base-background-subtle',
  alignItems: 'center',
  justifyContent: 'flex-start',
  paddingHorizontal: '$2',
  gap: '$4',
})

let TopbarButton = styled('button', {
  all: 'unset',
  padding: '$1',
  width: '$8',
  height: '$8',
  borderRadius: '$2',
  backgroundColor: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '&:hover': {
    cursor: 'pointer',
    backgroundColor: '$base-component-bg-hover',
  },
})

export const topbarSection = css({
  height: '$full',
  display: 'flex',
  alignItems: 'center',
})

export function Topbar({copy = copyTextToClipboard}) {
  let mainPage = useMainPage()
  let bookmarkService = useBookmarksService()
  let [mainState] = useActor(mainPage)
  let title = usePageTitle()
  console.log('🚀 ~ file: topbar.tsx ~ line 59 ~ Topbar ~ title', title)
  debug('🚀 ~ file: topbar.tsx ~ line 58 ~ Topbar ~ title', title)
  let {data, isSuccess, isError} = useAccount(
    mainState.context.document?.author,
  )

  if (isError) {
    error('accountError!')
  }

  function toggleLibrary() {
    mainState.context.library.send('LIBRARY.TOGGLE')
  }

  async function onCopyReference() {
    if (mainState.matches('routes.publication')) {
      await copy(
        `${MINTTER_LINK_PREFIX}${mainState.context.params.docId}/${mainState.context.params.version}`,
      )
      toast.success('Document Reference copied successfully', {
        position: 'top-center',
      })
    }
  }

  function onBookmark() {
    if (mainState.matches('routes.publication')) {
      bookmarkService.send({
        type: 'BOOKMARK.ADD',
        url: `${MINTTER_LINK_PREFIX}${mainState.context.params.docId}/${mainState.context.params.version}`,
      })
    }
  }

  return (
    <TopbarStyled data-tauri-drag-region>
      <span style={{display: 'block', flex: 'none', width: 60}} />
      <Box css={{display: 'flex'}} {...draggableProps}>
        <TopbarButton
          color="muted"
          data-testid="history-back"
          onClick={(e) => {
            e.preventDefault()
            mainPage.send('goBack')
          }}
        >
          <Icon name="ArrowChevronLeft" color="muted" size="2" />
        </TopbarButton>
        <TopbarButton
          color="muted"
          data-testid="history-forward"
          onClick={(e) => {
            e.preventDefault()
            mainPage.send('goForward')
          }}
        >
          <Icon name="ArrowChevronRight" color="muted" size="2" />
        </TopbarButton>
      </Box>

      <Box
        css={{
          flex: 'none',
          width: '$full',
          maxWidth: 460,
          display: 'flex',
          alignItems: 'baseline',
          gap: '$2',
        }}
        data-tauri-drag-region
      >
        <Text
          size="3"
          fontWeight="bold"
          aria-label="Document Title"
          data-testid="topbar-title"
          data-tauri-drag-region
          css={{flex: 'none'}}
        >
          {title}
        </Text>
        {mainState.hasTag('documentView') ? (
          <>
            <Text size="1" color="muted">
              by
            </Text>
            {isSuccess ? (
              <Text
                size="1"
                color="muted"
                css={{textDecoration: 'underline'}}
                data-testid="topbar-author"
              >
                {data!.profile?.alias}
              </Text>
            ) : (
              <Text size="1" color="muted" css={{textDecoration: 'underline'}}>
                ...
              </Text>
            )}
          </>
        ) : null}
      </Box>
      {mainState.hasTag('publication') ? (
        <Box>
          <Dropdown.Root>
            <Dropdown.Trigger asChild>
              <TopbarButton>
                <Icon size="1" name="MoreHorizontal" />
              </TopbarButton>
            </Dropdown.Trigger>
            <Dropdown.Content alignOffset={-5} align="end">
              <Dropdown.Item onSelect={onCopyReference}>
                <Icon size="1" name="Copy" />
                Copy Document Reference
              </Dropdown.Item>
              <Dropdown.Item onSelect={onBookmark}>
                <Icon size="1" name="ArrowBottomRight" />
                Add to Bookmarks
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Root>
        </Box>
      ) : null}

      <Box css={{flex: 1}} />
      <Box css={{flex: 'none'}}>
        <TopbarButton
          css={{
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '$2',
            height: '$full',
          }}
          onClick={toggleLibrary}
          data-tauri-drag-region
        >
          <Text size="2">Local Node</Text>
          <Icon name="Sidenav" size="2" />
        </TopbarButton>
      </Box>
    </TopbarStyled>
  )
}
