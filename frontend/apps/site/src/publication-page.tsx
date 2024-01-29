import {
  Account,
  HMGroup,
  HMPublication,
  HYPERMEDIA_ENTITY_TYPES,
  Publication,
  PublicationContent,
  PublicationHeading,
  UnpackedHypermediaId,
  createHmDocLink,
  createHmGroupDocLink,
  createHmId,
  groupDocUrl,
  unpackHmId,
} from '@mintter/shared'

import {
  ArrowRight,
  Button,
  SideSection,
  SideSectionTitle,
  SizableText,
  Spinner,
  YStack,
} from '@mintter/ui'
import {DehydratedState} from '@tanstack/react-query'
import Head from 'next/head'
import {useEffect} from 'react'
import {BasicOGMeta, OGImageMeta, getPublicationDescription} from 'src/head'
import {SitePublicationContentProvider} from 'src/site-embeds'
import {WebTipping} from 'src/web-tipping'
import {ErrorPage, SmallContainer} from './error-page'
import {OpenInAppLink} from './metadata'
import {PublicationMetadata} from './publication-metadata'
import {SiteHead} from './site-head'
import {MainSiteLayout} from './site-layout'
import {trpc} from './trpc'

export type PublicationPageProps = {
  // documentId: string
  // version: string | null
  // metadata?: boolean
  trpcState: DehydratedState
}

export type PublicationPageData = {
  documentId: string
  version?: string
  publication?: Publication | null
  author?: Account | null
  editors: Array<Account | string | null> | null
}

function DocumentNotFoundPage({
  id,
  version,
}: {
  id: string
  version?: string | null
}) {
  return (
    <ErrorPage title="Document not found" description={`Document Id: ${id}`}>
      <SizableText color="$color9">version: {version}</SizableText>
    </ErrorPage>
  )
}

function DiscoveryPage({id, version}: {id: string; version?: string | null}) {
  const entityId = unpackHmId(id)
  const entityTypeName = entityId
    ? HYPERMEDIA_ENTITY_TYPES[entityId.type]
    : 'Entity'
  const utils = trpc.useContext()
  const discover = trpc.entities.discover.useMutation({
    onSuccess: () => {
      if (entityId?.type === 'd') {
        utils.publication.get.invalidate({
          documentId: id,
          versionId: version || undefined,
        })
      } else if (entityId?.type === 'g') {
        utils.group.get.invalidate({groupId: id, version: version || undefined})
      } else if (entityId?.type === 'a') {
        utils.account.get.invalidate({accountId: id})
      }
    },
  })
  useEffect(() => {
    discover.mutateAsync({id, version: version || undefined}).then(() => {
      console.log('discovery complete')
    })
  }, [id, version])
  if (!discover.isLoading && !discover.error) {
    return <DocumentNotFoundPage id={id} version={version} />
  }
  return (
    <MainSiteLayout head={<SiteHead pageTitle={`Searching...`} />}>
      <SmallContainer>
        <SizableText size="$5" fontWeight="800" textAlign="center">
          Looking for this {entityTypeName}
        </SizableText>

        {discover.isLoading ? (
          <>
            <SizableText color="$color9" textAlign="center">
              This was not found on the gateway right now. Trying to find a peer
              on the network who has this content...
            </SizableText>
            <Spinner />
          </>
        ) : null}
        {discover.error ? (
          <>
            <SizableText>
              Failed to find entity. {discover.error.message}
            </SizableText>
          </>
        ) : null}
      </SmallContainer>
    </MainSiteLayout>
  )
}

export function PublicationPage({
  pathName,
  documentId,
  version,
  contextGroup,
}: {
  pathName?: string
  documentId: string
  version?: string | null
  contextGroup?: HMGroup | null
}) {
  const publication = trpc.publication.get.useQuery({
    documentId: documentId,
    versionId: version || '',
  })

  const pub = publication.data?.publication
  const pubId = pub?.document?.id ? unpackHmId(pub?.document?.id) : null
  const pubVersion = pub?.version
  const ogImageUrl =
    pubId && pubVersion
      ? `/api/content-image/${pubId.type}/${pubId.eid}/${pubVersion}/media.png`
      : undefined
  if (!pub && !publication.isLoading) {
    if (process.env.NEXT_PUBLIC_ENABLE_DISCOVERY) {
      return <DiscoveryPage id={documentId} version={version} />
    }
    return <DocumentNotFoundPage id={documentId} version={version} />
  }
  const contextGroupId = contextGroup?.id ? unpackHmId(contextGroup?.id) : null
  return (
    <>
      <Head>
        <meta name="hypermedia-entity-id" content={pub?.document?.id} />
        {pubId && (
          <meta
            name="hypermedia-url"
            content={
              contextGroupId
                ? createHmId('g', contextGroupId.eid, {
                    version: contextGroup?.version,
                    groupPathName: pathName,
                  })
                : createHmId('d', pubId.eid, {version: pubVersion})
            }
          />
        )}
        <meta name="hypermedia-entity-version" content={pub?.version} />
        <meta name="hypermedia-entity-title" content={pub?.document?.title} />
        <BasicOGMeta
          title={pub?.document?.title}
          userName={pub?.document?.author} // todo: if we see any social media use this field, look up the actual alias
          description={getPublicationDescription(pub)}
        />
        {ogImageUrl && <OGImageMeta url={ogImageUrl} />}
      </Head>
      <MainSiteLayout
        head={<SiteHead pageTitle={pub?.document?.title} />}
        leftSide={
          <PublicationContextSide
            group={contextGroup}
            activePathName={pathName || ''}
          />
        }
        rightSide={
          <>
            <YStack>
              <PublicationMetadata publication={pub} pathName={pathName} />
              <WebTipping
                docId={documentId}
                editors={pub?.document?.editors || []}
              >
                <OpenInAppLink
                  url={
                    contextGroup?.id && pathName
                      ? createHmGroupDocLink(
                          contextGroup.id,
                          pathName,
                          contextGroup.version,
                        )
                      : createHmDocLink({
                          documentId,
                          version: pub?.version,
                        })
                  }
                />
              </WebTipping>
            </YStack>
          </>
        }
      >
        {pub ? (
          <>
            <SitePublicationContentProvider unpackedId={pubId}>
              {pub.document?.title ? (
                <PublicationHeading>{pub.document.title}</PublicationHeading>
              ) : null}
              <PublicationContent
                // paddingHorizontal={0}
                // $gtMd={{paddingHorizontal: '$3'}}
                // $gtLg={{paddingHorizontal: '$3'}}
                publication={pub}
              />
            </SitePublicationContentProvider>
          </>
        ) : publication.isLoading ? (
          <PublicationPlaceholder />
        ) : null}
      </MainSiteLayout>
    </>
  )
}

function PublicationPlaceholder() {
  return (
    <YStack gap="$6">
      <BlockPlaceholder />
      <BlockPlaceholder />
      <BlockPlaceholder />
      <BlockPlaceholder />
    </YStack>
  )
}

function BlockPlaceholder() {
  return (
    <YStack gap="$3">
      <YStack width="90%" height={16} backgroundColor="$color6" />
      <YStack height={16} backgroundColor="$color6" />
      <YStack width="75%" height={16} backgroundColor="$color6" />
      <YStack width="60%" height={16} backgroundColor="$color6" />
    </YStack>
  )
}

export function useGroupContentUrl(
  groupEid: string | undefined,
  groupVersion?: string,
  pathName?: string,
) {
  const siteInfo = trpc.siteInfo.get.useQuery()
  if (!groupEid) return null
  const rootPathName = pathName === '/' ? '/' : pathName
  return siteInfo.data?.groupEid === groupEid
    ? rootPathName
    : groupDocUrl(groupEid, groupVersion, pathName || '/')
}

function GroupSidebarContentItem({
  item,
  groupVersion,
  groupId,
  activePathName,
}: {
  item: ContentItem
  groupVersion: string | undefined
  groupId: UnpackedHypermediaId
  activePathName: string
}) {
  const contentUrl = useGroupContentUrl(
    groupId.eid,
    groupVersion,
    item.pathName,
  )
  if (!contentUrl) return null
  return (
    <Button
      key={item.pathName}
      iconAfter={activePathName === item.pathName ? <ArrowRight /> : null}
      tag="a"
      href={contentUrl}
      size="$3"
      chromeless
      justifyContent="flex-start"
      backgroundColor={
        activePathName === item.pathName ? '$backgroundHover' : 'transparent'
      }
      hoverStyle={{
        backgroundColor: '$backgroundHover',
      }}
    >
      {item?.publication?.document?.title}
    </Button>
  )
}

type ContentItem = {
  publication: null | HMPublication
  pathName: string
  version: string
  docId: UnpackedHypermediaId
}

function GroupSidebarContent({
  group,
  activePathName,
  content,
}: {
  activePathName: string
  group?: HMGroup
  content?: Array<null | ContentItem>
}) {
  const groupId = group?.id ? unpackHmId(group?.id) : null
  return (
    <SideSection>
      {groupId?.eid ? <SideSectionTitle>Site Content:</SideSectionTitle> : null}
      {content?.map((item) => {
        if (!item || !groupId?.eid) return null
        return (
          <GroupSidebarContentItem
            key={item.pathName}
            item={item}
            groupId={groupId}
            groupVersion={group?.version}
            activePathName={activePathName}
          />
        )
      })}
    </SideSection>
  )
}

function PublicationContextSide({
  group,
  activePathName,
  ...props
}: {
  group?: HMGroup | null
  activePathName: string
}) {
  const groupContent = trpc.group.listContent.useQuery(
    {
      groupId: group?.id || '',
      version: group?.version || '',
    },
    {enabled: !!group?.id},
  )
  const groupSidebarContent = group ? (
    <GroupSidebarContent
      activePathName={activePathName}
      group={group}
      content={groupContent.data}
    />
  ) : null

  return groupSidebarContent
}
