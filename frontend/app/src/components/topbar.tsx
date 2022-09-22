import {MINTTER_LINK_PREFIX} from '@app/constants'
import {Dropdown, dropdownLabel} from '@app/editor/dropdown'
import {findContext} from '@app/editor/find'
import {CurrentFile, DraftRef, PublicationRef} from '@app/main-machine'
import {css, styled} from '@app/stitches.config'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {useBookmarksService} from '@components/bookmarks'
import {Button} from '@components/button'
import {Text} from '@components/text'
import {TippingModal} from '@components/tipping-modal'
import {Tooltip} from '@components/tooltip'
import {useActor} from '@xstate/react'
import {useContext, useEffect, useRef} from 'react'
import toast from 'react-hot-toast'
import {Box} from './box'
import {Icon} from './icon'

import {useAccountProfile} from '@app/auth-context'
import {
  useCurrentFile,
  useIsEditing,
  useLibrary,
  useMain,
} from '@app/main-context'
import {listen} from '@tauri-apps/api/event'
import '../styles/find.scss'

// type TopbarProps = {
//   copy?: typeof copyTextToClipboard
//   currentFile?: CurrentFile | null
// }

const draggableProps = {
  'data-tauri-drag-region': true,
}

export function Topbar() {
  const mainService = useMain()
  let [mainState] = useActor(mainService)
  let profile = useAccountProfile()
  let isEditing = useIsEditing()
  let library = useLibrary()
  let file = useCurrentFile()

  function handleLinbraryToggle() {
    console.log('toggle library!', library)
    library?.send('LIBRARY.TOGGLE')
  }

  return (
    <Box
      data-layout-section="topbar"
      className={wrapperStyles({
        visible: !isEditing,
      })}
      {...draggableProps}
    >
      <Box
        data-topbar-section="main"
        className={topbarSectionStyles({type: 'main'})}
        {...draggableProps}
      >
        {file ? (
          <FileTitle fileRef={file} />
        ) : (
          <TopbarTitle
            title={
              mainState.matches('routes.draftList')
                ? 'Drafts'
                : mainState.matches('routes.publicationList') ||
                  mainState.matches('routes.home')
                ? 'Publications'
                : ''
            }
          />
        )}
      </Box>
      <Find />
      {file ? <TopbarFileActions fileRef={file} /> : null}
      <TopbarLibrarySection
        handleLibraryToggle={handleLinbraryToggle}
        handleBack={() => mainService.send('GO.BACK')}
        handleForward={() => mainService.send('GO.BACK')}
        libraryLabel={profile?.alias ?? ''}
      />
    </Box>
  )
}

function FileTitle({fileRef}: {fileRef: CurrentFile}) {
  let [fileState] = useActor(fileRef)

  return (
    <>
      <TopbarTitle {...draggableProps} title={fileState.context.title} />
      {fileRef.id.startsWith('pub-') ? (
        <Text
          size="1"
          color="muted"
          css={{
            userSelect: 'none',
            textDecoration: 'underline',
            whiteSpace: 'nowrap',
            '&:hover': {
              cursor: 'default',
            },
          }}
          data-testid="topbar-author"
          {...draggableProps}
        >
          {fileState.context.author?.profile?.alias || 'AUTHOR'}
        </Text>
      ) : null}
    </>
  )
}

export function TopbarLibrarySection({
  handleLibraryToggle,
  handleBack,
  handleForward,
  libraryLabel,
}: {
  libraryLabel: string
  handleLibraryToggle: () => void
  handleBack: () => void
  handleForward: () => void
}) {
  return (
    <Box
      data-topbar-section="library"
      className={topbarSectionStyles()}
      {...draggableProps}
    >
      <TopbarButton
        data-testid="history-back"
        onClick={(e) => {
          e.preventDefault()
          handleBack()
        }}
      >
        <Icon name="ArrowChevronLeft" color="muted" size="2" />
      </TopbarButton>
      <TopbarButton
        data-testid="history-forward"
        onClick={(e) => {
          e.preventDefault()
          handleForward()
        }}
      >
        <Icon name="ArrowChevronRight" color="muted" size="2" />
      </TopbarButton>
      <Box
        css={{
          display: 'flex',
          flex: 1,
          justifyContent: 'end',
          paddingInlineEnd: '$2',
        }}
        {...draggableProps}
      >
        <TopbarButton
          data-testid="library-toggle-button"
          css={{
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '$3',
            height: '$full',
            paddingHorizontal: '$3',
          }}
          onClick={(e) => {
            e.preventDefault()
            handleLibraryToggle()
          }}
          data-tauri-drag-region
        >
          <Text size="2">{libraryLabel}</Text>
          <Icon name="Sidenav" size="2" />
        </TopbarButton>
      </Box>
    </Box>
  )
}

function TopbarFileActions({fileRef}: {fileRef: CurrentFile}) {
  if (fileRef.id.startsWith('draft-')) {
    return <DraftActions fileRef={fileRef as DraftRef} />
  } else {
    return <PublicationActions fileRef={fileRef as PublicationRef} />
  }
}

function DraftActions({fileRef}: {fileRef: DraftRef}) {
  let [state, send] = useActor(fileRef)
  return (
    <Box
      data-topbar-section="actions"
      className={topbarSectionStyles({type: 'actions'})}
      data-testid="topbar-draft-actions"
      {...draggableProps}
    >
      <Button
        color="success"
        variant="ghost"
        size="1"
        disabled={!state.can('DRAFT.PUBLISH')}
        data-testid="submit-publish"
        onClick={() => {
          send('DRAFT.PUBLISH')
        }}
      >
        Done
      </Button>
    </Box>
  )
}

function PublicationActions({
  fileRef,
  copy = copyTextToClipboard,
}: {
  fileRef: PublicationRef
  copy?: typeof copyTextToClipboard
}) {
  let [state] = useActor(fileRef)
  const bookmarkService = useBookmarksService()
  const mainService = useMain()
  const [mainState] = useActor(mainService)
  async function onCopyReference() {
    await copy(
      `${MINTTER_LINK_PREFIX}${state.context.publication?.document?.id}/${state.context.publication?.version}`,
    )
    toast.success('Document Reference copied successfully', {
      position: 'top-center',
    })
  }

  function onBookmark() {
    bookmarkService.send({
      type: 'BOOKMARK.ADD',
      url: `${MINTTER_LINK_PREFIX}${state.context.publication?.document?.id}/${state.context.publication?.version}`,
    })
  }
  return (
    <Box
      data-topbar-section="actions"
      className={topbarSectionStyles({type: 'actions'})}
      data-testid="topbar-publication-actions"
      {...draggableProps}
    >
      <Box
        css={{
          display: 'none',
          alignItems: 'center',
          gap: '$3',
          zIndex: '$max',
          '@bp1': {
            display: 'flex',
          },
        }}
      >
        <Tooltip content="Copy document reference">
          <TopbarButton onClick={onCopyReference}>
            <Icon name="Copy" size="1" />
          </TopbarButton>
        </Tooltip>
        <Tooltip content="Add to boomarks">
          <TopbarButton onClick={onBookmark}>
            <Icon name="Bookmark" size="1" />
          </TopbarButton>
        </Tooltip>
      </Box>
      <Box
        css={{
          display: 'flex',
          alignItems: 'center',
          '@bp1': {
            display: 'none',
          },
        }}
      >
        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <TopbarButton css={{padding: '0.3rem'}}>
              <Icon size="1" name="MoreHorizontal" color="muted" />
            </TopbarButton>
          </Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content alignOffset={-5} align="end">
              {!state.context.canUpdate ? (
                <TippingModal fileRef={fileRef} />
              ) : null}
              <Dropdown.Item onSelect={onCopyReference}>
                <Icon size="1" name="Copy" />
                <span className={dropdownLabel()}>Copy Document Reference</span>
              </Dropdown.Item>
              <Dropdown.Item onSelect={onBookmark}>
                <Icon size="1" name="ArrowBottomRight" />
                <span className={dropdownLabel()}>Add to Bookmarks</span>
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      </Box>
      <Dropdown.Root>
        <Tooltip content="Edit Actions">
          <Dropdown.Trigger asChild>
            <TopbarButton
              variant="outlined"
              css={{
                padding: '0.3rem',
              }}
            >
              <Icon size="1" name="Pencil" color="muted" />
              <Icon
                name="ArrowChevronDown"
                color="muted"
                css={{
                  zoom: 0.5,
                }}
              />
            </TopbarButton>
          </Dropdown.Trigger>
        </Tooltip>
        <Dropdown.Portal>
          <Dropdown.Content alignOffset={-5} align="end">
            {state.context.canUpdate ? (
              <Dropdown.Item
                onSelect={() =>
                  mainService.send({type: 'COMMIT.EDIT.PUBLICATION'})
                }
              >
                <Icon size="1" name="Pencil" />
                <span className={dropdownLabel()}>Edit</span>
              </Dropdown.Item>
            ) : null}

            <Dropdown.Item
              onSelect={() => mainService.send('COMMIT.OPEN.WINDOW')}
            >
              <Icon size="1" name="File" />
              <span className={dropdownLabel()}>New Document</span>
            </Dropdown.Item>
            <Dropdown.Item
              disabled={mainState.matches('routes.publication.replying')}
              onSelect={() => mainService.send('COMMIT.CREATE.REPLY')}
            >
              <Icon size="1" name="MessageBubble" />
              <span className={dropdownLabel()}>Reply</span>
            </Dropdown.Item>
            <Dropdown.Item>
              <Icon size="1" name="PencilAdd" />
              <span className={dropdownLabel()}>Review</span>
            </Dropdown.Item>
            <Dropdown.Separator color="muted" />
            <Dropdown.Item disabled>
              <Box
                css={{
                  paddingBlock: '1rem',
                  userSelect: 'none',
                }}
              >
                pub date here
              </Box>
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown.Portal>
      </Dropdown.Root>
    </Box>
  )
}

var wrapperStyles = css({
  display: 'flex',
  alignItems: 'center',
  paddingInlineStart: '80px',
  blockSize: '100%',
  borderBottom: '1px solid $colors$base-border-subtle',
  background: '$base-background-subtle',
  transition: 'all 0.25s ease',
  '& > *': {
    // align items here
  },
  variants: {
    visible: {
      false: {
        opacity: 0,
      },
      true: {
        opacity: 1,
      },
    },
  },
})

var topbarSectionStyles = css({
  display: 'flex',
  alignItems: 'center',
  '& > *': {
    '&:hover': {
      cursor: 'default',
    },
  },
  variants: {
    type: {
      main: {
        flex: 1,
        gap: '0.5rem',
        minWidth: 0,
      },
      actions: {
        paddingInline: '0.5rem',
        gap: '0.5rem',
      },
      library: {
        flex: 'none',

        paddingInline: '0.5rem',
        '@bp2': {
          inlineSize: 'var(--library-size)',
        },
      },
    },
  },
})

var titleStyles = css({
  fontFamily: '$base',
  fontWeight: '$medium',
  userSelect: 'none',
  '@initial': {
    fontSize: '1rem',
  },
  '@bp2': {
    fontSize: '1.1rem',
  },
  maxWidth: '40ch',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  '& > *': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
})

function TopbarTitle({title}: {title: string}) {
  return (
    <span
      data-testid="topbar-title"
      className={titleStyles()}
      {...draggableProps}
    >
      <span {...draggableProps}>{title}</span>
    </span>
  )
}

var TopbarButton = styled('button', {
  all: 'unset',
  padding: '$1',
  gap: '0.3rem',
  inlineSize: '$8',
  blockSize: '$8',
  borderRadius: '$2',
  backgroundColor: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '&:hover': {
    backgroundColor: '$base-component-bg-hover',
  },
  variants: {
    variant: {
      outlined: {
        '&:hover': {
          boxShadow: 'inset 0px 0px 0px 1px $colors$base-border-normal',
        },
      },
    },
  },
})

function Find() {
  const {search, setSearch} = useContext(findContext)
  const searchInput = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let unlisten: () => void | undefined

    listen('open_find', () => {
      searchInput.current?.focus()
    }).then((f) => (unlisten = f))

    return () => unlisten?.()
  })

  return (
    <label id="find">
      <Icon name="Search" />
      <input
        ref={searchInput}
        type="search"
        autoCorrect="off"
        placeholder="Search"
        value={search}
        onInput={(e) => setSearch(e.target.value)}
      />
    </label>
  )
}

var shellStyles = css({
  blockSize: '100%',
  borderBottom: '1px solid $colors$base-border-subtle',
  background: '$base-background-subtle',
})

export function TopbarShell() {
  return <div className={shellStyles()} data-layout-section="topbar" />
}
