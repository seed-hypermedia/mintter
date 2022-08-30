import {
  deleteDraft as defaultDeleteDraft,
  deletePublication as defaultDeletePublication,
} from '@app/client'
import {deleteFileMachine} from '@app/delete-machine'
import {Dropdown, ElementDropdown} from '@app/editor/dropdown'
import {findContext} from '@app/editor/find'
import {useMain, useParams} from '@app/main-context'
import {DraftRef, PublicationRef} from '@app/main-machine'
import {css, styled} from '@app/stitches.config'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {debug} from '@app/utils/logger'
import {useBookmarksService} from '@components/bookmarks'
import {Box} from '@components/box'
import {DeleteDialog} from '@components/delete-dialog'
import {Icon} from '@components/icon'
import {Text} from '@components/text'
import {useActor, useInterpret} from '@xstate/react'
import {PropsWithChildren, useContext, useMemo} from 'react'
import Highlighter from 'react-highlight-words'
import toast from 'react-hot-toast'

export type LibraryItemProps = {
  fileRef: PublicationRef | DraftRef
  deleteDraft?: typeof defaultDeleteDraft
  deletePublication?: typeof defaultDeletePublication
  copy?: typeof copyTextToClipboard
  isNew: boolean
}

let hoverIconStyle = css({
  color: '$base-text-opposite !important',
})

export function LibraryItem({
  fileRef,
  copy = copyTextToClipboard,
  deleteDraft = defaultDeleteDraft,
  deletePublication = defaultDeletePublication,
  isNew = false,
}: PropsWithChildren<LibraryItemProps>) {
  const [state] = useActor(fileRef)
  let bookmarksService = useBookmarksService()
  let params = useParams()
  const mainService = useMain()
  let isPublication = useMemo(() => fileRef.id.startsWith('pub-'), [fileRef.id])
  let match = useMemo(() => {
    if (isPublication) {
      return (
        state.context.documentId == params.docId &&
        state.context.version == params.version
      )
    } else {
      return state.context.documentId == params.docId
    }
  }, [params.docId, params.version, isPublication, state.context])

  const deleteService = useInterpret(
    () =>
      deleteFileMachine.withContext({
        documentId: state.context.documentId,
        version: state.context.version,
        errorMessage: '',
      }),
    {
      services: {
        performDelete: (context) => {
          if (context.version) {
            return deletePublication(context.documentId, context.version)
          } else {
            return deleteDraft(context.documentId)
          }
        },
      },
      actions: {
        persistDelete: (context) => {
          mainService.send({
            type: 'COMMIT.DELETE.FILE',
            documentId: context.documentId,
            version: context.version,
          })
        },
        removeFileFromBookmarks: (context) => {
          debug('removeFileFromBookmarks!!')
          bookmarksService.send({
            type: 'BOOKMARK.FILE.DELETE',
            documentId: context.documentId,
            version: context.version,
          })
        },
      },
    },
  )
  const [deleteState] = useActor(deleteService)

  async function onCopy() {
    if (isPublication) {
      await copy(`mtt://${state.context.documentId}/${state.context.version}`)
      toast.success('Document ID copied successfully', {position: 'top-center'})
    }
  }

  function goToItem() {
    if (match) return

    if (isPublication) {
      mainService.send({
        type: 'GO.TO.PUBLICATION',
        docId: state.context.documentId,
        version: state.context.version as string,
        blockId: '',
      })
    } else {
      mainService.send({type: 'GO.TO.DRAFT', docId: state.context.documentId})
    }
  }

  async function onOpenInNewWindow() {
    mainService.send({
      type: 'COMMIT.OPEN.WINDOW',
      path: isPublication
        ? `/p/${state.context.documentId}/${state.context.version}`
        : `/editor/${state.context.documentId}`,
    })
  }

  let title = state.context.title || 'Untitled Document'

  const {search} = useContext(findContext)

  return (
    <Box
      css={{
        position: 'relative',
        '&:hover': {
          cursor: 'pointer',
          backgroundColor: '$$bgHover',
        },
      }}
    >
      {isPublication ? (
        <Box
          css={{
            position: 'absolute',
            zIndex: '$3',
            insetInlineStart: 0,
            insetBlockStart: 0,
            transform: 'translateX(-50%)',
            inlineSize: 16,
            blockSize: '$full',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isNew ? (
            <Box
              css={{
                inlineSize: 6,
                blockSize: 6,
                borderRadius: '$round',
                backgroundColor: '$primary-active',
              }}
            />
          ) : null}
        </Box>
      ) : null}
      <StyledItem active={match} data-testid="library-item">
        <Highlighter
          highlightClassName="search-highlight"
          className="title"
          searchWords={[search]}
          autoEscape={true}
          textToHighlight={title}
          onClick={goToItem}
        />

        <Dropdown.Root modal={false}>
          <Dropdown.Trigger asChild>
            <ElementDropdown
              data-trigger
              className="dropdown"
              css={{
                backgroundColor: 'transparent',
              }}
            >
              <Icon
                name="MoreHorizontal"
                size="1"
                color="muted"
                className={match ? hoverIconStyle() : ''}
              />
            </ElementDropdown>
          </Dropdown.Trigger>
          <Dropdown.Content
            align="start"
            data-testid="library-item-dropdown-root"
            hidden={deleteState.matches('open')}
          >
            <Dropdown.Item
              data-testid="copy-item"
              disabled={!isPublication}
              onSelect={onCopy}
            >
              <Icon name="Copy" size="1" />
              <Text size="2">Copy Document ID</Text>
            </Dropdown.Item>
            <Dropdown.Item data-testid="mainpanel-item" onSelect={goToItem}>
              <Icon size="1" name="ArrowTopRight" />
              <Text size="2">Open in main panel</Text>
            </Dropdown.Item>
            <Dropdown.Item
              data-testid="new-window-item"
              onSelect={onOpenInNewWindow}
            >
              <Icon size="1" name="OpenInNewWindow" />
              <Text size="2">Open in new Window</Text>
            </Dropdown.Item>
            <DeleteDialog
              deleteRef={deleteService}
              title="Delete document"
              description="Are you sure you want to delete this document? This action is not reversible."
            >
              <Dropdown.Item
                data-testid="delete-item"
                onSelect={(e) => e.preventDefault()}
              >
                <Icon size="1" name="Close" />
                <Text size="2">Delete Document</Text>
              </Dropdown.Item>
            </DeleteDialog>
          </Dropdown.Content>
        </Dropdown.Root>
      </StyledItem>
    </Box>
  )
}

export var StyledItem = styled(
  'li',
  {
    $$bg: 'transparent',
    $$bgHover: '$colors$base-component-bg-hover',
    $$foreground: '$colors$base-text-high',
    display: 'flex',
    minHeight: 28,
    alignItems: 'center',
    position: 'relative',
    borderRadius: '$1',
    backgroundColor: '$$bg',
    paddingHorizontal: '$2',
    '&:hover': {
      cursor: 'pointer',
      backgroundColor: '$$bgHover',
      '.dropdown': {
        opacity: 1,
      },
    },
    '.title': {
      userSelect: 'none',
      letterSpacing: '0.01em',
      lineHeight: '$2',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      color: '$$foreground',
      flex: 1,
      paddingHorizontal: '$3',
      paddingVertical: '$2',
    },
    '.dropdown': {
      opacity: 0,
    },
  },
  {
    defaultVariants: {
      active: false,
    },
    variants: {
      active: {
        true: {
          $$bg: '$colors$primary-normal',
          $$bgHover: '$colors$primary-active',
          $$foreground: '$colors$primary-text-opposite',
        },
      },
    },
  },
)
