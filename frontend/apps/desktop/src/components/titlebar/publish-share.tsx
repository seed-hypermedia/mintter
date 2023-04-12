import {isProduction, MINTTER_GATEWAY_URL} from '@app/constants'
import {MainActor} from '@app/hooks/main-actor'
import {useDocPublications, useSiteList} from '@app/hooks/sites'
import {useDaemonReady} from '@app/node-status-context'
import {PublicationActor} from '@app/publication-machine'
import {styled} from '@app/stitches.config'
import {useNavRoute} from '@app/utils/navigation'
import {hostnameStripProtocol} from '@app/utils/site-hostname'
import {Box} from '@components/box'
import {AccessURLRow} from '@components/url'
import {WebPublicationRecord} from '@mintter/shared'
import {Button, ButtonText, ExternalLink, Globe, SizableText} from '@mintter/ui'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import {UseQueryResult} from '@tanstack/react-query'
import {useSelector} from '@xstate/react'
import {useEffect, useRef, useState} from 'react'
import {usePublicationDialog} from './publication-dialog'

const forceProductionURL = true

function getMintterPublicURL(docId: string, version: string) {
  return `${
    isProduction || forceProductionURL
      ? MINTTER_GATEWAY_URL
      : 'http://localhost:3000'
  }/p/${docId}?v=${version}`
}

function MintterURLRow({doc}: {doc: PublicationActor}) {
  const {title, url} = useSelector(doc, (state) => {
    const {documentId, version} = state.context
    return {
      title: `mintter.com/p/${documentId}`,
      url: getMintterPublicURL(documentId, version),
    }
  })
  return <AccessURLRow url={url} title={title} />
}

function PublishedURLs({
  publications,
  doc,
}: {
  publications: UseQueryResult<WebPublicationRecord[]>
  doc: MainActor['actor']
}) {
  if (!publications.data) {
    if (publications.isLoading) return <div>Loading...</div>
    if (publications.error) return <div>Failed to load.</div>
  }
  if (publications.data && publications.data?.length === 0)
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
          >
            <ButtonText flex={1}>
              {hostnameStripProtocol(site.hostname)}
            </ButtonText>
          </Button>
        )
      })}
    </>
  )
}
const ButtonIcon = styled('span', {
  marginHorizontal: 12,
})

export function PublishShareButton({mainActor}: {mainActor: MainActor}) {
  const route = useNavRoute()
  const isDraft = route.key === 'draft'
  const isPublication = route.key === 'publication'
  const docId = route.key === 'publication' ? route.documentId : undefined
  const [isOpen, setIsOpen] = useState(false)
  const publicationDialog = usePublicationDialog(mainActor)
  const isDaemonReady = useDaemonReady()
  const publications = useDocPublications(docId)
  let isSaving = useRef(false)
  useEffect(() => {
    if (mainActor.type == 'publication') {
      isSaving.current = false
    } else {
      mainActor.actor.subscribe((state) => {
        if (state.matches('editing.saving')) {
          // console.log('subscribe change TRUE!', state.value)
          isSaving.current = true
        } else {
          // console.log('subscribe change FALSE!', state.value)
          isSaving.current = false
        }
      })
    }
  }, [mainActor])

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
        <PopoverPrimitive.Trigger
          asChild
          disabled={!isDaemonReady || isSaving.current}
        >
          <Button
            size="$2"
            chromeless
            disabled={!isDaemonReady || isSaving.current}
            onPress={(e) => {
              e.preventDefault()
              if (isOpen) {
                setIsOpen(false)
                return
              }

              if (mainActor.type == 'draft') {
                mainActor.actor.send('DRAFT.PUBLISH')
              }
              setIsOpen(true)
            }}
            theme="green"
          >
            {mainActor.type === 'draft' ? (
              'Publish'
            ) : (
              <>
                <Globe size={16} />
              </>
            )}
          </Button>
        </PopoverPrimitive.Trigger>
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
              {docId && (
                <PublishedURLs
                  publications={publications}
                  doc={mainActor.actor}
                />
              )}
              <PublishButtons
                publications={publications.data}
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
