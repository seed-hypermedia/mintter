import {MINTTER_GATEWAY_URL} from '@mintter/app/src/constants'
import {
  EditorDraftState,
  useDraft,
  usePublication,
  usePublishDraft,
  useWriteDraftWebUrl,
} from '@mintter/app/src/models/documents'
import {useDocWebPublications, useSiteList} from '@mintter/app/src/models/sites'
import {useDaemonReady} from '@mintter/app/src/node-status-context'
import {useNavigate, useNavRoute} from '@mintter/app/src/utils/navigation'
import {hostnameStripProtocol} from '@mintter/app/src/utils/site-hostname'
import {AccessURLRow} from '@mintter/app/src/components/url'
import {Publication, WebPublicationRecord} from '@mintter/shared'
import {
  Button,
  Check,
  ChevronDown,
  Copy,
  DialogTitle,
  ExternalLink,
  Form,
  Globe,
  Popover,
  Select,
  SizableText,
  Spinner,
  YStack,
} from '@mintter/ui'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import {UseQueryResult} from '@tanstack/react-query'
import {useEffect, useMemo, useRef, useState} from 'react'
import toast from 'react-hot-toast'
import {usePublicationDialog} from './publication-dialog'
import {Tooltip} from '@mintter/app/src/components/tooltip'
import {copyTextToClipboard} from '@mintter/app/src/copy-to-clipboard'
import {Upload} from '@tamagui/lucide-icons'
import DiscardDraftButton from './discard-draft-button'
import {getDocUrl} from '@mintter/app/src/utils/doc-url'
import {MintterIcon} from '@mintter/app/src/components/mintter-icon'
import {usePopoverState} from '../../use-popover-state'
import {useAppDialog} from '../dialog'
import {useGroups, usePublishDocToGroup} from '../../models/groups'
import {useMyAccount} from '../../models/accounts'

function DraftPublicationDialog({
  draft,
}: {
  draft?: EditorDraftState | undefined
}) {
  const sites = useSiteList()
  const sitesList = sites.data || []
  const foundSiteHostname = sitesList.find(
    (site) => site.hostname === draft?.webUrl,
  )
  const writeSiteUrl = useWriteDraftWebUrl(draft?.id)

  return (
    <>
      <SizableText size="$3" fontWeight="700" theme="mint">
        Publish to:
      </SizableText>
      <Button
        size="$4"
        onPress={() => {
          writeSiteUrl.mutate('')
        }}
        textProps={{flex: 1}}
        icon={Globe}
        iconAfter={foundSiteHostname == null ? Check : undefined}
      >
        Public Network
      </Button>
      {sitesList?.map((site) => {
        return (
          <Button
            size="$4"
            key={site.hostname}
            onPress={() => {
              writeSiteUrl.mutate(site.hostname)
            }}
            textProps={{flex: 1}}
            icon={Globe}
            iconAfter={
              foundSiteHostname?.hostname === site.hostname ? Check : undefined
            }
          >
            {hostnameStripProtocol(site.hostname)}
          </Button>
        )
      })}
    </>
  )
}

function GroupPublishDialog({
  input,
}: {
  input: {docId: string; version: string}
}) {
  const groupQuery = useGroups()
  const groups = groupQuery.data?.groups
  const account = useMyAccount()
  const accountId = account.data?.id
  const myGroups = useMemo(() => {
    if (!groups || !accountId) return undefined
    return groups.filter((group) => group.ownerAccountId === accountId)
  }, [groups, accountId])
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>()
  useEffect(() => {
    if (myGroups?.length && !selectedGroupId)
      setSelectedGroupId(myGroups[0]?.id)
  }, [myGroups, selectedGroupId])
  const publishToGroup = usePublishDocToGroup()
  if (!myGroups) return <Spinner />
  return (
    <Form
      onSubmit={() => {
        console.log('submit ' + selectedGroupId)
        if (!selectedGroupId) {
          toast.error('Please select a group')
          return
        }
        toast.promise(
          publishToGroup.mutateAsync({
            groupId: selectedGroupId,
            docId: input.docId,
            version: input.version,
          }),
          {
            loading: 'Publishing...',
            success: 'Published to Group',
            error: 'Failed to Publish!',
          },
        )
      }}
    >
      <DialogTitle>Publish to Group</DialogTitle>
      <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
        <Select.Trigger>
          <Select.Value placeholder="Select Group.." />
        </Select.Trigger>
        <Select.Content zIndex={1000}>
          <Select.ScrollUpButton />
          {myGroups?.map((group, index) => (
            <Select.Item index={index} value={group.id} key={group.id}>
              <Select.ItemText>{group.title}</Select.ItemText>
            </Select.Item>
          ))}
          <Select.ScrollDownButton />
        </Select.Content>
      </Select>
      <Form.Trigger asChild>
        <Button>Submit</Button>
      </Form.Trigger>
    </Form>
  )
}

function PubDropdown({docId, version}: {docId: string; version: string}) {
  // const route = useNavRoute()
  // const documentId =
  //   route.key == 'publication'
  //     ? route.documentId
  //     : route.key == 'draft'
  //     ? route.draftId
  //     : undefined
  // const versionId = route.key == 'publication' ? route.versionId : undefined
  // const {data: publication} = usePublication({
  //   documentId,
  //   versionId,
  //   enabled: !!documentId,
  // })
  // const isWebPub = publication?.document?.webUrl != null
  // const label = publication?.document?.webUrl
  //   ? hostnameStripProtocol(publication.document.webUrl)
  //   : 'Public'
  const popoverState = usePopoverState()
  const groupPublish = useAppDialog(GroupPublishDialog)
  return (
    <>
      <Popover {...popoverState} placement="bottom-end">
        <Popover.Trigger asChild>
          <Button size="$2" icon={Globe} />
        </Popover.Trigger>
        <Popover.Content padding={0} elevation="$2">
          <YStack>
            <Button
              onPress={() => {
                groupPublish.open({docId, version})
              }}
              size="$2"
            >
              Publish to Group
            </Button>
          </YStack>
        </Popover.Content>
      </Popover>
      {groupPublish.content}
    </>
  )
}

// function SitePubDropdown({hostname}: {hostname: string}) {
//   return (
//     <Button
//       size="$2"
//       theme="green"
//       icon={Globe}
//       disabled // todo implement this dropdown
//     >
//       {hostnameStripProtocol(hostname)}
//     </Button>
//   )
// }

// function DraftPubDropdown() {
//   const [isOpen, setIsOpen] = useState(false)
//   const route = useNavRoute()
//   const documentId =
//     route.key == 'publication'
//       ? route.documentId
//       : route.key == 'draft'
//       ? route.draftId
//       : undefined
//   const {data: draft} = useDraft({
//     documentId,
//     enabled: route.key == 'draft' && !!documentId,
//   })

//   const label = draft?.webUrl ? hostnameStripProtocol(draft.webUrl) : 'Public'

//   return (
//     <>
//       <PopoverPrimitive.Root
//         open={isOpen}
//         onOpenChange={(open) => {
//           setIsOpen(open)
//         }}
//       >
//         <PopoverPrimitive.Trigger asChild>
//           <Button
//             size="$2"
//             theme="green"
//             icon={Globe}
//             iconAfter={ChevronDown}
//             onPress={() => {
//               // setIsOpen(true)
//             }}
//           >
//             {label}
//           </Button>
//         </PopoverPrimitive.Trigger>
//         <PopoverPrimitive.Portal>
//           <PopoverPrimitive.Content
//             align="start"
//             style={{
//               zIndex: 200000,
//             }}
//           >
//             <YStack
//               width={300}
//               padding="$4"
//               margin="$2"
//               borderRadius="$2"
//               backgroundColor="$backgroundStrong"
//               borderWidth={1}
//               borderColor="$gray4"
//               gap="$4"
//             >
//               <DraftPublicationDialog draft={draft || undefined} />
//             </YStack>
//           </PopoverPrimitive.Content>
//         </PopoverPrimitive.Portal>
//       </PopoverPrimitive.Root>
//     </>
//   )
// }

export function PublicationDropdown() {
  const route = useNavRoute()
  const documentId = route.key == 'publication' ? route.documentId : undefined
  const routeVersionId =
    route.key == 'publication' ? route.versionId : undefined

  const pub = usePublication({
    documentId,
    versionId: routeVersionId,
    enabled: !!documentId,
  })
  if (!pub.data || !documentId) return null
  return <PubDropdown version={pub.data.version} docId={documentId} />
}

export function DraftPublicationButtons() {
  const route = useNavRoute()
  if (route.key !== 'draft')
    throw new Error('DraftPublicationButtons requires draft route')
  const draftId = route.draftId
  let navReplace = useNavigate('replace')
  const isDaemonReady = useDaemonReady()
  const publish = usePublishDraft({
    onSuccess: (publishedDoc) => {
      if (!publishedDoc || !draftId) return
      navReplace({
        key: 'publication',
        documentId: draftId,
        versionId: publishedDoc.version,
      })
      toast.success('Document saved and set to public')
    },
    onError: (e: any) => {
      toast.error('Failed to publish: ' + e.message)
    },
  })
  return (
    <>
      <Button
        size="$2"
        disabled={!isDaemonReady}
        onPress={() => {
          console.log('did start publish', draftId, isDaemonReady)
          publish.mutate({draftId})
        }}
        theme="green"
        icon={Check}
      >
        Save
      </Button>
      <DiscardDraftButton />
    </>
  )
}

export function PublishShareButton() {
  const route = useNavRoute()
  const isDraft = route.key == 'draft'
  const isPublication = route.key == 'publication'
  const documentId =
    route.key == 'publication'
      ? route.documentId
      : route.key == 'draft'
      ? route.draftId
      : undefined
  const versionId = route.key == 'publication' ? route.versionId : undefined
  const {data: loadedPub} = usePublication({
    documentId,
    versionId,
    enabled: route.key == 'publication' && !!documentId,
  })
  const pub = route.key === 'publication' ? loadedPub : undefined
  const {data: draft} = useDraft({
    documentId,
    enabled: route.key == 'draft' && !!documentId,
  })
  const draftId = route.key == 'draft' ? route.draftId : undefined
  const publicationDialog = usePublicationDialog()

  const isDaemonReady = useDaemonReady()
  // const publications = useDocPublications(documentId)
  const publishedWebHost = pub?.document
    ? pub.document.webUrl || 'https://mintter.com'
    : null
  let isSaving = useRef(false)
  let navReplace = useNavigate('replace')
  const publish = usePublishDraft({
    onSuccess: (publishedDoc, doc) => {
      if (!publishedDoc || !documentId) return
      navReplace({
        key: 'publication',
        documentId,
        versionId: publishedDoc.version,
      })
      if (publishedDoc.document?.webUrl) {
        toast.success(`Published to ${hostnameStripProtocol(webUrl)}`)
      } else {
        toast.success('Document saved and set to public')
      }
    },
    onError: (e: any) => {
      toast.error('Failed to publish: ' + e.message)
    },
  })

  let webUrl = useMemo(() => {
    return pub?.document?.webUrl || draft?.webUrl
  }, [route, pub, draft])

  let copyReferenceButton
  const webPubs = useDocWebPublications(documentId)
  const webPub = webPubs.data?.find(
    (pub) =>
      documentId && pub.hostname === webUrl && pub.documentId === documentId,
  )

  if (isPublication) {
    copyReferenceButton = (
      <Tooltip
        content={`Copy Document URL on ${hostnameStripProtocol(
          publishedWebHost,
        )}`}
      >
        <Button
          chromeless
          size="$2"
          onPress={() => {
            if (!publishedWebHost) throw new Error('Document not loaded')
            const docUrl = getDocUrl(pub, webPub)
            if (!docUrl) return
            copyTextToClipboard(docUrl)
            toast.success(
              `Copied ${hostnameStripProtocol(publishedWebHost)} URL`,
            )
          }}
          icon={Copy}
        />
      </Tooltip>
    )
  }

  const isWebPublish = !!webUrl
  const draftActionLabel = isWebPublish
    ? `Publish to ${hostnameStripProtocol(webUrl)}`
    : 'Publish'
  if (isDraft) {
    return (
      <>
        {webPubs.isInitialLoading ? <Spinner /> : null}
        <Button
          size="$2"
          chromeless={!isDraft}
          disabled={!isDaemonReady || isSaving.current}
          onPress={(e) => {
            if (webUrl && !webPub) {
              publicationDialog.open(webUrl)
            } else if (draftId) {
              publish.mutate({draftId})
            }
          }}
          theme="green"
          icon={isDraft ? (isWebPublish ? Upload : Check) : Globe}
        >
          {isDraft ? draftActionLabel : hostnameStripProtocol(webUrl) || null}
        </Button>
        <DiscardDraftButton />
        {copyReferenceButton}
        {publicationDialog.content}
      </>
    )
  }
  if (isPublication) {
    return copyReferenceButton || null
  }
  return null
}
