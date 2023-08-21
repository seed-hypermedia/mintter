import {
  GetServerSideProps,
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from 'next'
import {setAllowAnyHostGetCORS} from 'server/cors'
import {getPageProps, serverHelpers} from 'server/ssr-helpers'
import Head from 'next/head'
import {SiteHead} from '../../../site-head'

import {trpc} from '../../../trpc'
import {PageSection, Text, YStack, Footer} from '@mintter/ui'
import Link from 'next/link'
import {HDGroup} from 'server/json-hd'

function GroupMetadata({group}: {group: HDGroup}) {
  return null
}

export default function GroupPage({
  groupEid,
  version,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const group = trpc.group.get.useQuery({
    groupEid,
    //version
  })
  const groupContent = trpc.group.listContent.useQuery({
    groupEid,
  })

  const loadedGroup = group.data?.group

  return (
    <YStack flex={1}>
      <Head>
        {loadedGroup ? (
          <>
            <meta
              name="hyperdocs-entity-id"
              content={`hd://g/${loadedGroup.id}`}
            />
            <meta
              name="hyperdocs-entity-version"
              content={loadedGroup.version}
            />
            <meta name="hyperdocs-entity-title" content={loadedGroup.title} />
          </>
        ) : null}
      </Head>
      <SiteHead
        title={loadedGroup?.title}
        titleHref={`/g/${loadedGroup?.id}`}
      />
      <PageSection.Root flex={1}>
        <PageSection.Side />
        <PageSection.Content>
          {/* {pub ? (
              <PublicationContent publication={pub} />
            ) : publication.isLoading ? (
              <PublicationPlaceholder />
            ) : (
              <YStack
                padding="$4"
                borderRadius="$5"
                elevation="$1"
                borderColor="$color5"
                borderWidth={1}
                backgroundColor="$color3"
                gap="$3"
              >
                <SizableText size="$5" fontWeight="800" textAlign="center">
                  Document not found.
                </SizableText>
                <SizableText color="$color9">
                  Document Id: {documentId}
                </SizableText>
                <SizableText color="$color9">version: {version}</SizableText>
              </YStack>
            )}*/}
          <Text>{loadedGroup?.description}</Text>
          {groupContent.data
            ? groupContent.data.map((contentItem) => {
                return (
                  <Link
                    key={contentItem?.pathName}
                    href={`/g/${groupEid}/${contentItem?.pathName}`}
                  >
                    <Text key={contentItem?.pathName}>
                      {contentItem?.publication?.document?.title}
                    </Text>
                  </Link>
                )
              })
            : null}
        </PageSection.Content>
        <PageSection.Side>
          <YStack className="publication-sidenav-sticky">
            <GroupMetadata group={group} />
          </YStack>
        </PageSection.Side>
      </PageSection.Root>
      <Footer />
    </YStack>
  )
}

export const getServerSideProps: GetServerSideProps = async (
  context: GetServerSidePropsContext,
) => {
  const {params, query} = context
  let groupEid = params?.groupId ? String(params.groupId) : undefined
  let version = query.v ? String(query.v) : null

  setAllowAnyHostGetCORS(context.res)

  if (!groupEid) return {notFound: true} as const

  const helpers = serverHelpers({})

  const groupRecord = await helpers.group.get.fetch({
    groupEid,
  })

  await helpers.group.listContent.prefetch({
    groupEid,
  })

  return {
    props: await getPageProps(helpers, {groupEid, version}),
  }
}
