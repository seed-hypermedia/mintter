import {isProduction, MINTTER_GATEWAY_URL} from '@app/constants'
import {useDraft, usePublication, usePublishDraft} from '@app/models/documents'
import {queryKeys} from '@app/models/query-keys'
import {
  useDocPublications,
  useDocRepublish,
  useSiteList,
} from '@app/models/sites'
import {useDaemonReady} from '@app/node-status-context'
import {appInvalidateQueries} from '@app/query-client'
import {useNavigate, useNavRoute} from '@app/utils/navigation'
import {hostnameStripProtocol} from '@app/utils/site-hostname'
import {Box} from '@components/box'
import {AccessURLRow} from '@components/url'
import {Publication, WebPublicationRecord} from '@mintter/shared'
import {Button, ExternalLink, Globe, SizableText, Spinner} from '@mintter/ui'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import {GestureReponderEvent} from '@tamagui/web'
import {UseQueryResult} from '@tanstack/react-query'
import {useMemo, useRef, useState} from 'react'
import toast from 'react-hot-toast'
import {usePublicationDialog} from './publication-dialog'

const forceProductionURL = true

function getMintterPublicURL(docId: string, version: string) {
  return `${
    isProduction || forceProductionURL
      ? MINTTER_GATEWAY_URL
      : 'http://localhost:3000'
  }/p/${docId}?v=${version}`
}

function MintterURLRow({doc}: {doc: Publication}) {
  const {title, url} = useMemo(
    () => ({
      title: doc.document?.title,
      url: doc.document
        ? getMintterPublicURL(doc.document.id, doc.version)
        : '',
    }),
    [doc],
  )

  return <AccessURLRow url={url} title={title} />
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
      <SizableText size="$3" fontWeight="700" theme="blue">
        Public on the Web:
      </SizableText>
      {publications.data?.map((pub) => {
        const shortHost = hostnameStripProtocol(pub.hostname)
        const displayURL = pub.path
          ? pub.path === '/'
            ? shortHost
            : `${shortHost}/${pub.path}`
          : `${shortHost}/p/${pub.documentId}`
        const fullURL = pub.path
          ? pub.path === '/'
            ? pub.hostname
            : `${pub.hostname}/${pub.path}?v=${pub.version}`
          : `${pub.hostname}/p/${pub.documentId}?v=${pub.version}`
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
      <SizableText size="$3" fontWeight="700" theme="blue">
        Publish to:
      </SizableText>
      {sitesList?.map((site) => {
        return (
          <Button
            size="$4"
            theme="blue"
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

function PublishButton({
  webUrl,
  onPress,
  disabled,
  isDraft,
}: {
  webUrl?: null | string
  onPress: (e: GestureReponderEvent) => void
  disabled?: boolean
  isDraft?: boolean
}) {
  const draftActionLabel = webUrl ? `Publish to ${webUrl}` : 'Publish'
  return (
    <PopoverPrimitive.Trigger asChild disabled={disabled}>
      <Button
        size="$2"
        chromeless
        disabled={disabled}
        onPress={onPress}
        theme="green"
      >
        {isDraft ? (
          draftActionLabel
        ) : (
          <>
            <Globe size={16} />
            {hostnameStripProtocol(webUrl)}
          </>
        )}
      </Button>
    </PopoverPrimitive.Trigger>
  )
}

function PublishShareContent({
  docId,
  publications,
  onPublish,
  publication,
}: {
  docId?: string
  publications: UseQueryResult<WebPublicationRecord[]>
  onPublish: (hostname: string) => void
  publication?: Publication
}) {
  return (
    <>
      {docId && <PublishedURLs publications={publications} doc={publication} />}
      <PublishButtons publications={publications.data} onPublish={onPublish} />
    </>
  )
}

export function PublishShareButton() {
  const route = useNavRoute()
  const isDraft = route.key == 'draft'
  const isPublication = route.key == 'publication'
  // I changed the otherwise return to an empty string because that way the useDraft hook will not complain
  const documentId =
    route.key == 'publication'
      ? route.documentId
      : route.key == 'draft'
      ? route.documentId
      : ''
  const versionId = route.key == 'publication' ? route.versionId : undefined
  const {data: pub} = usePublication({
    documentId,
    versionId,
    enabled: route.key == 'publication',
  })
  const {data: draft} = useDraft({
    documentId,
    routeKey: route.key,
    enabled: route.key == 'draft' && !!documentId,
  })
  const [isOpen, setIsOpen] = useState(false)
  const publicationDialog = usePublicationDialog()
  const isDaemonReady = useDaemonReady()
  const publications = useDocPublications(documentId)
  let isSaving = useRef(false)
  const republishDoc = useDocRepublish({
    onSuccess: (webPubs) => {
      if (!webPubs.length) return
      toast.success(
        `Document updated on ${webPubs
          .map((pub) => hostnameStripProtocol(pub.hostname))
          .join(', ')}`,
      )
    },
  })
  let navReplace = useNavigate('replace')
  const publish = usePublishDraft({
    onSuccess: (publishedDoc, doc) => {
      if (publishedDoc?.document?.id) return
      toast.success('Draft published Successfully!')
      appInvalidateQueries([queryKeys.GET_PUBLICATION_LIST])
      appInvalidateQueries([queryKeys.GET_PUBLICATION, documentId])
      appInvalidateQueries([queryKeys.PUBLICATION_CHANGES, documentId])
      appInvalidateQueries([queryKeys.PUBLICATION_CITATIONS])
      republishDoc.mutateAsync(publishedDoc)
      navReplace({
        key: 'publication',
        documentId: doc,
        versionId: publishedDoc.version,
      })
    },
  })

  let webUrl = useMemo(() => {
    return pub?.document?.webUrl || draft?.webUrl
  }, [route, pub, draft])

  if (!isDraft && !isPublication) return null
  return (
    <>
      <PopoverPrimitive.Root
        open={isOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsOpen(true)
          } else {
            setIsOpen(false)
          }
        }}
      >
        <PublishButton
          webUrl={webUrl}
          disabled={!isDaemonReady || isSaving.current}
          isDraft={route.key === 'draft'}
          onPress={(e) => {
            e.preventDefault()
            if (isOpen) {
              setIsOpen(false)
              return
            }

            if (draft?.id) {
              publish.mutate(draft.id)
            }

            setIsOpen(true)
          }}
        />

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="end"
            style={{
              zIndex: 200000,
            }}
          >
            <Box
              css={{
                width: '300px',
                display: 'flex',
                flexDirection: 'column',
                padding: '$4',
                margin: '$2',
                boxShadow: '$3',
                borderRadius: '$2',
                backgroundColor: '$primary-background-subtle',
                border: '1px solid blue',
                borderColor: '$primary-border-subtle',
                gap: '$4',
              }}
            >
              <PublishShareContent
                docId={pub?.document?.id}
                publications={publications}
                publication={pub}
                onPublish={(hostname) => {
                  setIsOpen(false)
                  publicationDialog.open(hostname)
                }}
              />
            </Box>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
      {publicationDialog.content}
    </>
  )
}
