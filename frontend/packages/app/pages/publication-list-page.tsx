import Footer from '@mintter/app/components/footer'
import {useDraftList} from '@mintter/app/models/documents'
import {
  Button,
  ButtonText,
  Container,
  Copy,
  DialogDescription,
  DialogTitle,
  Separator,
  SizableText,
  Spinner,
  XGroup,
  XStack,
  YStack,
} from '@mintter/ui'
import {
  Row,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {useVirtual} from 'react-virtual'

import {Document, createPublicWebHmUrl, unpackHmId} from '@mintter/shared'
import {Globe, Pencil, Trash, Verified} from '@tamagui/lucide-icons'
import copyTextToClipboard from 'copy-text-to-clipboard'
import {ComponentProps, memo, useMemo, useRef} from 'react'
import {useAppContext} from '../app-context'
import {BaseAccountLinkAvatar} from '../components/account-link-avatar'
import {DeleteDocumentDialog} from '../components/delete-dialog'
import {useDeleteDraftDialog} from '../components/delete-draft-dialog'
import {useAppDialog} from '../components/dialog'
import {EmptyList} from '../components/empty-list'
import {ListItem, TimeAccessory} from '../components/list-item'
import {MainWrapper} from '../components/main-wrapper'
import {queryDraft, usePublicationFullList} from '../models/documents'
import {useWaitForPublication} from '../models/web-links'
import {toast} from '../toast'
import {DraftRoute, useNavRoute} from '../utils/navigation'
import {useOpenDraft} from '../utils/open-draft'
import {useClickNavigate, useNavigate} from '../utils/useNavigate'

export const PublicationListPage = memo(PublicationListPageUnmemo)

export function PublicationListPageUnmemo() {
  const route = useNavRoute()
  if (route.key !== 'documents') throw new Error('invalid route')
  const trustedOnly = route.tab === 'trusted' || route.tab == null
  const draftsOnly = route.tab === 'drafts'
  const allDocs = route.tab === 'all'
  const replace = useNavigate('replace')

  let content = <PublicationsList trustedOnly={false} key="all" />
  if (trustedOnly)
    content = <PublicationsList trustedOnly={true} key="trusted" />
  if (draftsOnly) content = <DraftsList />

  return (
    <>
      <MainWrapper>
        <Container>
          <XStack>
            <XGroup separator={<Separator />}>
              <ToggleGroupItem
                label="Trusted Creators"
                icon={Verified}
                active={trustedOnly}
                onPress={() => {
                  if (!trustedOnly) {
                    replace({
                      ...route,
                      tab: 'trusted',
                    })
                  }
                }}
              />
              <ToggleGroupItem
                label="All Creators"
                icon={Globe}
                active={allDocs}
                onPress={() => {
                  if (!allDocs) {
                    replace({
                      ...route,
                      tab: 'all',
                    })
                  }
                }}
              />
              <ToggleGroupItem
                label="My Drafts"
                icon={Pencil}
                active={draftsOnly}
                onPress={() => {
                  if (!draftsOnly) {
                    replace({
                      ...route,
                      tab: 'drafts',
                    })
                  }
                }}
              />
            </XGroup>
          </XStack>
        </Container>
        {content}
      </MainWrapper>
      <Footer />
    </>
  )
}

function ToggleGroupItem({
  label,
  icon,
  active,
  onPress,
}: {
  label: string
  icon: ComponentProps<typeof Button>['icon'] | undefined
  active: boolean
  onPress: () => void
}) {
  return (
    <XGroup.Item>
      <Button
        disabled={active}
        icon={icon}
        backgroundColor={active ? '$color7' : undefined}
        onPress={onPress}
      >
        {label}
      </Button>
    </XGroup.Item>
  )
}

export function PublishedFirstDocDialog({
  input,
  onClose,
}: {
  input: {docId: string}
  onClose: () => void
}) {
  const {externalOpen} = useAppContext()
  const id = unpackHmId(input.docId)
  if (!id) throw new Error('invalid doc id')
  const url = createPublicWebHmUrl('d', id.eid)
  const {resultMeta, timedOut} = useWaitForPublication(url, 120)
  return (
    <>
      <DialogTitle>Congrats!</DialogTitle>
      <DialogDescription>
        Your doc has been published. You can share your doc on the public
        Hypermedia gateway:
      </DialogDescription>
      <XStack jc="space-between" ai="center">
        {resultMeta ? (
          <ButtonText
            color="$blue10"
            size="$2"
            fontFamily={'$mono'}
            fontSize="$4"
            onPress={() => {
              externalOpen(url)
            }}
          >
            {url}
          </ButtonText>
        ) : (
          <Spinner />
        )}
        {timedOut ? (
          <DialogDescription theme="red">
            We failed to publish your document to the hypermedia gateway. Please
            try again later.
          </DialogDescription>
        ) : null}
        <Button
          size="$2"
          icon={Copy}
          onPress={() => {
            copyTextToClipboard(url)
            toast.success('Copied link to document')
          }}
        />
      </XStack>
      <Button onPress={onClose}>Done</Button>
    </>
  )
}

function PublicationsList({trustedOnly}: {trustedOnly: boolean}) {
  const publications = usePublicationFullList({trustedOnly})
  const drafts = useDraftList()
  const {queryClient, grpcClient} = useAppContext()
  const deleteDialog = useAppDialog(DeleteDocumentDialog, {isAlert: true})

  const items = useMemo(
    () =>
      publications.data?.map((item) => ({
        id: `${item.publication.document!.id}-${item.publication.version}`,
        title: item.publication.document!.title,
        author: item.author,
        editors: item.editors,
        updatedAt: item.publication.document?.updateTime,
      })) || [],
    [publications.data],
  )

  const columns = useMemo(
    () => [
      {
        accessorKey: 'title',
        cell: (info) => <SizableText>{info.getValue()}</SizableText>,
      },
      // {
      //   accessorKey: 'author',
      // },
      {
        accessorKey: 'editors',
        cell: (info) => {
          let editors = info.getValue()
          return (
            <XStack>
              {editors && editors.length
                ? editors.map((editor, idx) => {
                    const editorId =
                      typeof editor === 'string' ? editor : editor?.id
                    if (!editorId) return null
                    const account =
                      typeof editor === 'string' ? undefined : editor
                    return (
                      <XStack
                        zIndex={idx + 1}
                        key={editorId}
                        borderColor="$background"
                        backgroundColor="$background"
                        borderWidth={2}
                        borderRadius={100}
                        marginLeft={-8}
                        animation="fast"
                      >
                        <BaseAccountLinkAvatar
                          accountId={editorId}
                          account={account}
                        />
                      </XStack>
                    )
                  })
                : null}
            </XStack>
          )
        },
      },
      {
        accessorKey: 'updateAt',
        cell: (info) => (
          <TimeAccessory time={info.getValue()} onPress={() => {}} />
        ),
      },
    ],
    [],
  )

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    debugTable: true,
  })

  const tableContainerRef = useRef<HTMLDivElement>(null)

  const {rows} = table.getRowModel()
  const rowVirtualizer = useVirtual({
    parentRef: tableContainerRef,
    size: rows.length,
    overscan: 10,
  })
  const {virtualItems: virtualRows, totalSize} = rowVirtualizer

  const paddingTop = virtualRows.length > 0 ? virtualRows?.[0]?.start || 0 : 0
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows?.[virtualRows.length - 1]?.end || 0)
      : 0

  if (!items) return <Spinner />
  return (
    <Container ref={tableContainerRef}>
      <table>
        <tbody>
          {paddingTop > 0 && (
            <tr id="top-row">
              <td style={{height: `${paddingTop}px`}} />
            </tr>
          )}
          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index] as Row<any>
            return (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  return (
                    <td key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
          {paddingBottom > 0 && (
            <tr id="bottom-row">
              <td style={{height: `${paddingBottom}px`}} />
            </tr>
          )}
        </tbody>
      </table>

      {deleteDialog.content}
    </Container>
  )
}

function DraftsList() {
  const drafts = useDraftList()
  const openDraft = useOpenDraft('push')
  return (
    <Container>
      {drafts.isInitialLoading ? (
        <Spinner />
      ) : drafts.data?.documents.length ? (
        <YStack>
          {drafts.data.documents.map((draft) => (
            <DraftListItem key={draft.id} draft={draft} />
          ))}
        </YStack>
      ) : (
        <EmptyList
          description="You have no current Drafts."
          action={() => {
            openDraft()
          }}
        />
      )}
    </Container>
  )
}

function DraftListItem({draft}: {draft: Document}) {
  let title = draft.title || 'Untitled Document'
  const deleteDialog = useDeleteDraftDialog()
  const navigate = useClickNavigate()
  const {queryClient, grpcClient} = useAppContext()
  if (!draft.id) throw new Error('DraftListItem requires an id')
  const draftRoute: DraftRoute = {key: 'draft', draftId: draft.id}
  const goToItem = (e: any) => {
    navigate(draftRoute, e)
  }
  return (
    <>
      <ListItem
        title={title}
        onPointerEnter={() => {
          queryClient.client.prefetchQuery(
            queryDraft({grpcClient, documentId: draft.id}),
          )
        }}
        onPress={goToItem}
        accessory={<></>}
        menuItems={[
          {
            label: 'Delete Draft',
            key: 'delete',
            icon: Trash,
            onPress: () => {
              deleteDialog.open({draftId: draft.id})
            },
          },
        ]}
      />
      {deleteDialog.content}
    </>
  )
}
