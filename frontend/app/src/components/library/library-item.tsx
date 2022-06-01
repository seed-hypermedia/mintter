import {
  deleteDraft as defaultDeleteDraft,
  deletePublication as defaultDeletePublication,
  Document,
  Publication,
} from '@app/client'
import {Dropdown, ElementDropdown} from '@app/editor/dropdown'
import {useMainPage, useParams} from '@app/main-page-context'
import {css, styled} from '@app/stitches.config'
import {copyTextToClipboard as defaultCopyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {getDocumentTitle} from '@app/utils/get-document-title'
import {DeleteDialog, deleteDialogMachine} from '@components/delete-dialog'
import {Icon} from '@components/icon'
import {Text} from '@components/text'
import {useActor, useMachine} from '@xstate/react'
import {PropsWithChildren, useMemo} from 'react'
import toast from 'react-hot-toast'

export type LibraryItemProps = {
  publication?: Publication
  draft?: Document
  href: string
  deleteDraft?: typeof defaultDeleteDraft
  deletePublication?: typeof defaultDeletePublication
  copyTextToClipboard?: typeof defaultCopyTextToClipboard
}

let hoverIconStyle = css({
  color: '$base-text-opposite !important',
})

export function LibraryItem({
  publication,
  draft,
  href,
  deleteDraft = defaultDeleteDraft,
  deletePublication = defaultDeletePublication,
  copyTextToClipboard = defaultCopyTextToClipboard,
}: PropsWithChildren<LibraryItemProps>) {
  const mainService = useMainPage()
  const [mainState] = useActor(mainService)
  let params = useParams()
  let match = useMemo(() => {
    let docId = publication ? publication.document?.id : draft?.id
    return params.docId == docId && params.version == publication?.version
  }, [params.docId, params.version])

  const [deleteState, deleteSend] = useMachine(() => deleteDialogMachine, {
    services: {
      deleteEntry: () => () =>
        publication
          ? deletePublication(publication.document?.id as string)
          : deleteDraft(draft?.id as string),
    },
    actions: {
      onSuccess: afterDelete,
    },
  })

  async function onCopy() {
    if (publication) {
      await copyTextToClipboard(
        `mtt://${publication.document?.id}/${publication.version}`,
      )
      toast.success('Document ID copied successfully', {position: 'top-center'})
    }
  }

  function goToItem() {
    if (match) return

    if (publication) {
      mainService.send({
        type: 'goToPublication',
        docId: publication.document!.id,
        version: publication.version,
        blockId: undefined,
      })
    } else {
      mainService.send({type: 'goToEditor', docId: draft!.id})
    }
  }

  function afterDelete() {
    if (match) {
      mainService.send('goToHome')
    }
    mainService.send('RECONCILE')
  }

  async function onOpenInNewWindow() {
    mainService.send({type: 'OPEN_WINDOW', path: href})
  }

  let title = match
    ? getDocumentTitle(mainState.context.document)
    : publication
    ? publication.document?.title
    : draft && draft.title
    ? draft.title
    : 'Untitled Document'

  return (
    <StyledItem active={match} data-testid="library-item">
      <Text size="2" className="title" color="primary" onClick={goToItem}>
        {title}
      </Text>

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
              className={match ? hoverIconStyle : null}
            />
          </ElementDropdown>
        </Dropdown.Trigger>
        <Dropdown.Content
          align="start"
          data-testid="library-item-dropdown-root"
          hidden={deleteState.matches('opened')}
        >
          <Dropdown.Item
            data-testid="copy-item"
            disabled={!!draft}
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
            data-testid="sidepanel-item"
            onSelect={onOpenInNewWindow}
          >
            <Icon size="1" name="OpenInNewWindow" />
            <Text size="2">Open in new Window</Text>
          </Dropdown.Item>
          <DeleteDialog
            state={deleteState}
            send={deleteSend}
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
