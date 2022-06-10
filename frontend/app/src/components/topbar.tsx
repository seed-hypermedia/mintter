import {MINTTER_LINK_PREFIX} from '@app/constants'
import {Dropdown} from '@app/editor/dropdown'
import {useMainPage} from '@app/main-page-context'
import {CurrentFile, DraftRef, PublicationRef} from '@app/main-page-machine'
import {css, styled} from '@app/stitches.config'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {useBookmarksService} from '@components/bookmarks'
import {Text} from '@components/text'
import {useActor} from '@xstate/react'
import {useMemo} from 'react'
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

type TopbarProps = {
  copy?: typeof copyTextToClipboard
  currentFile?: CurrentFile | null
}

export function Topbar({copy = copyTextToClipboard, currentFile}: TopbarProps) {
  let mainPage = useMainPage()
  let [mainState] = useActor(mainPage)
  // debug('CURRENT FILE:', mainState.context.currentFile)

  let title = useMemo(() => {
    if (mainState.matches('routes.draftList')) {
      return 'Drafts'
    }

    if (mainState.matches('routes.publicationList')) {
      return 'Publications'
    }

    return ''
  }, [mainState.value])

  function toggleLibrary() {
    mainState.context.library.send('LIBRARY.TOGGLE')
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
            mainPage.send('GO.BACK')
          }}
        >
          <Icon name="ArrowChevronLeft" color="muted" size="2" />
        </TopbarButton>
        <TopbarButton
          color="muted"
          data-testid="history-forward"
          onClick={(e) => {
            e.preventDefault()
            mainPage.send('GO.FORWARD')
          }}
        >
          <Icon name="ArrowChevronRight" color="muted" size="2" />
        </TopbarButton>
      </Box>
      {currentFile ? (
        <FilesData
          fileRef={currentFile}
          isPublication={mainState.hasTag('publication')}
        />
      ) : (
        <Text
          size="3"
          fontWeight="medium"
          aria-label="Document Title"
          data-testid="topbar-title"
          data-tauri-drag-region
          css={{flex: 'none'}}
        >
          {mainState.matches('routes.draftList')
            ? 'Drafts'
            : mainState.matches('routes.publicationList')
            ? 'Publications'
            : ''}
        </Text>
      )}
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

function FilesData({
  fileRef,
  isPublication = false,
  copy = copyTextToClipboard,
}: {
  copy: typeof copyTextToClipboard
  fileRef: PublicationRef | DraftRef
  isPublication: boolean
}) {
  let bookmarkService = useBookmarksService()
  const [state] = useActor(fileRef)

  async function onCopyReference() {
    if (isPublication) {
      await copy(
        `${MINTTER_LINK_PREFIX}${state.context.publication.document.id}/${state.context.publication.version}`,
      )
      toast.success('Document Reference copied successfully', {
        position: 'top-center',
      })
    }
  }

  function onBookmark() {
    if (isPublication) {
      bookmarkService.send({
        type: 'BOOKMARK.ADD',
        url: `${MINTTER_LINK_PREFIX}${state.context.publication.document.id}/${state.context.publication.version}`,
      })
    }
  }

  return (
    <>
      <Box
        css={{
          flex: 'none',
          width: '$full',
          maxWidth: 448,
          display: 'flex',
          alignItems: 'baseline',
          gap: '$2',
        }}
        data-tauri-drag-region
      >
        <Text
          size="3"
          fontWeight="medium"
          aria-label="Document Title"
          data-testid="topbar-title"
          data-tauri-drag-region
          css={{flex: 'none'}}
        >
          {state.context.title || 'Untitled Draft'}
        </Text>
        <Text size="1" color="muted">
          by
        </Text>

        <Text
          size="1"
          color="muted"
          css={{textDecoration: 'underline'}}
          data-testid="topbar-author"
        >
          {state.context?.author?.profile?.alias || 'AUTHOR'}
        </Text>
      </Box>
      {isPublication ? (
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
    </>
  )
}
