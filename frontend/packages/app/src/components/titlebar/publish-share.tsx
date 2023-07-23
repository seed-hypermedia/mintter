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
  ExternalLink,
  Globe,
  SizableText,
  Spinner,
  YStack,
} from '@mintter/ui'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import {UseQueryResult} from '@tanstack/react-query'
import {useMemo, useRef, useState} from 'react'
import toast from 'react-hot-toast'
import {usePublicationDialog} from './publication-dialog'
import {Tooltip} from '@mintter/app/src/components/tooltip'
import {copyTextToClipboard} from '@mintter/app'
import {Upload} from '@tamagui/lucide-icons'
import DiscardDraftButton from './discard-draft-button'
import {getDocUrl} from '@mintter/app/src/utils/doc-url'
import {MintterIcon} from '@mintter/app/src/components/mintter-icon'

const forceProductionURL = true

function getMintterPublicURL(docId: string, version: string) {
  return `${
    import.meta.env.PROD || forceProductionURL
      ? MINTTER_GATEWAY_URL
      : 'http://localhost:3000'
  }/d/${docId}?v=${version}`
}

function MintterURLRow({doc}: {doc: Publication}) {
  const {url} = useMemo(
    () => ({
      url: doc.document
        ? getMintterPublicURL(doc.document.id, doc.version)
        : '',
    }),
    [doc],
  )

  return <AccessURLRow url={url} title={hostnameStripProtocol(url)} />
}

function PublishedURLs({
  publications,
  doc,
}: {
  publications: UseQueryResult<WebPublicationRecord[]>
  doc?: Publication
}) {
  if (!publications.data) {
    if (publications.isLoading) return <Spinner />
    if (publications.error)
      return <SizableText theme="red">Failed to load.</SizableText>
  }
  if (publications.data && publications.data?.length === 0 && doc?.document)
    //@ts-ignore
    return <MintterURLRow doc={doc} />
  return (
    <>
      <SizableText size="$3" fontWeight="700" theme="mint">
        Public on the Web:
      </SizableText>
      {publications.data?.map((pub) => {
        const shortHost = hostnameStripProtocol(pub.hostname)
        const displayURL = pub.path
          ? pub.path == '/'
            ? shortHost
            : `${shortHost}/${pub.path}`
          : `${shortHost}/d/${pub.documentId}`
        const fullURL = pub.path
          ? pub.path == '/'
            ? pub.hostname
            : `${pub.hostname}/${pub.path}?v=${pub.version}`
          : `${pub.hostname}/d/${pub.documentId}?v=${pub.version}`
        return (
          <AccessURLRow
            key={`${pub.documentId}/${pub.version}`}
            url={fullURL}
            title={displayURL}
          />
        )
      })}
    </>
  )
}

function PublishButtons({
  onPublish,
  publications,
}: {
  onPublish: (hostname: string) => void
  publications?: WebPublicationRecord[]
}) {
  const sites = useSiteList()
  const sitesList = sites.data?.filter(({hostname}) => {
    if (publications?.find((pub) => pub.hostname === hostname)) return false
    return true
  })
  if (sitesList?.length === 0) return null
  return (
    <>
      <SizableText size="$3" fontWeight="700" theme="mint">
        Publish to:
      </SizableText>
      {sitesList?.map((site) => {
        return (
          <Button
            size="$4"
            theme="mint"
            key={site.hostname}
            onPress={() => {
              onPublish(site.hostname)
            }}
            iconAfter={ExternalLink}
            textProps={{flex: 1}}
          >
            {hostnameStripProtocol(site.hostname)}
          </Button>
        )
      })}
    </>
  )
}

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

function PubDropdown() {
  const route = useNavRoute()
  const documentId =
    route.key == 'publication'
      ? route.documentId
      : route.key == 'draft'
      ? route.draftId
      : undefined
  const versionId = route.key == 'publication' ? route.versionId : undefined
  const {data: publication} = usePublication({
    documentId,
    versionId,
    enabled: !!documentId,
  })
  const isWebPub = publication?.document?.webUrl != null
  const label = publication?.document?.webUrl
    ? hostnameStripProtocol(publication.document.webUrl)
    : 'Public'
  return (
    <Button
      size="$2"
      theme={isWebPub ? 'green' : 'mint'}
      icon={
        isWebPub ? Globe : (props) => <MintterIcon {...props} size={'$1'} />
      }
      disabled // todo implement this dropdown
    >
      {label}
    </Button>
  )
}

function SitePubDropdown({hostname}: {hostname: string}) {
  return (
    <Button
      size="$2"
      theme="green"
      icon={Globe}
      disabled // todo implement this dropdown
    >
      {hostnameStripProtocol(hostname)}
    </Button>
  )
}

function DraftPubDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const route = useNavRoute()
  const documentId =
    route.key == 'publication'
      ? route.documentId
      : route.key == 'draft'
      ? route.draftId
      : undefined
  const {data: draft} = useDraft({
    documentId,
    enabled: route.key == 'draft' && !!documentId,
  })

  const label = draft?.webUrl ? hostnameStripProtocol(draft.webUrl) : 'Public'

  return (
    <>
      <PopoverPrimitive.Root
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open)
        }}
      >
        <PopoverPrimitive.Trigger asChild>
          <Button
            size="$2"
            theme="green"
            icon={Globe}
            iconAfter={ChevronDown}
            onPress={() => {
              // setIsOpen(true)
            }}
          >
            {label}
          </Button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            style={{
              zIndex: 200000,
            }}
          >
            <YStack
              width={300}
              padding="$4"
              margin="$2"
              borderRadius="$2"
              backgroundColor="$backgroundStrong"
              borderWidth={1}
              borderColor="$gray4"
              gap="$4"
            >
              <DraftPublicationDialog draft={draft || undefined} />
            </YStack>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </>
  )
}
function PublishedPubDropdown() {
  return <PubDropdown />
}

export function PublicationDropdown() {
  const route = useNavRoute()
  const isDraft = route.key == 'draft'
  const isPublication = route.key == 'publication'
  const isSiteHome = route.key == 'site'
  if (isDraft) return <DraftPubDropdown />
  if (isPublication) return <PublishedPubDropdown />
  if (isSiteHome) return <SitePubDropdown hostname={route.hostname} />
  return null
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
              publish.mutate({draftId, webPub})
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
