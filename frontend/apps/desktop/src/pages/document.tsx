import { EntityVersionsAccessory } from '@/changes-list'
import { AccessoryLayout } from '@/components/accessory-sidebar'
import { BaseAccountLinkAvatar } from '@/components/account-link-avatar'
import { CitationsProvider } from '@/components/citations-context'
import { EntityCommentsAccessory } from '@/components/comments'
import { PushToGatewayDialog } from '@/components/copy-gateway-reference'
import { useAppDialog } from '@/components/dialog'
import { FavoriteButton } from '@/components/favoriting'
import Footer, { FooterButton } from '@/components/footer'
import { MainWrapper } from '@/components/main-wrapper'
import { useAccounts } from '@/models/accounts'
import { useDocHistory } from '@/models/changes'
import { useAllPublicationComments, useCreateComment } from '@/models/comments'
import { useEntityMentions } from '@/models/content-graph'
import { useGatewayHost } from '@/models/gateway-settings'
import { useNavRoute } from '@/utils/navigation'
import { useNavigate } from '@/utils/useNavigate'
import {
  DocContent,
  DocHeading,
  HMDocument,
  createHmId,
  formattedDateMedium,
  pluralS,
  unpackDocId,
  unpackHmId
} from '@shm/shared'
import {
  BlockQuote,
  ButtonText,
  SizableText,
  Text,
  XStack,
  YStack,
} from '@shm/ui'
import { History, MessageSquare } from '@tamagui/lucide-icons'
import 'allotment/dist/style.css'
import { ReactNode, useEffect, useRef } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useDocument } from 'src/models/documents'
import { AppErrorPage } from '../components/app-error'
import { EntityCitationsAccessory } from '../components/citations'
import { CopyReferenceButton } from '../components/titlebar-common'
import { getProfileName } from './account-page'
import { AppDocContentProvider } from './document-content-provider'

export default function PublicationPage() {
  const route = useNavRoute()
  if (route.key !== 'document')
    throw new Error('Publication page expects publication route')

  const docId = route?.documentId
  const accessory = route?.accessory
  const accessoryKey = accessory?.key
  const replace = useNavigate('replace')
  if (!docId)
    throw new Error(
      `Document route does not contain docId: ${JSON.stringify(route)}`,
    )
  const document = useDocument(
    docId,
    route.versionId,
  )

  const mentions = useEntityMentions(
    document.status == 'success' ? docId : undefined,
  )

  const id = unpackDocId(docId)

  const createComment = useCreateComment()
  const pushToGatewayDialog = useAppDialog(PushToGatewayDialog, {
    onClose: () => {
      if (route.immediatelyPromptPush) {
        replace({ ...route, immediatelyPromptPush: false })
      }
    },
  })
  const gwHost = useGatewayHost()
  useEffect(() => {
    if (id && route.immediatelyPromptPush)
      pushToGatewayDialog.open({
        context: 'publish',
        host: gwHost,
        ...id,
      })
  }, [docId, gwHost, route.immediatelyPromptPush])

  // const [rangeState, rangeSend, rangeActor] = useRangeSelection()
  const rangeRef = useRef<HTMLDivElement>(null)

  if (document.data) {
    let accessory: ReactNode | null = null

    if (accessoryKey == 'versions') {
      accessory = (
        <EntityVersionsAccessory
          id={unpackDocId(docId)}
          // variantVersion={publication.data?.variantVersion}
          activeVersion={document.data?.version}
        />
      )
    } else if (accessoryKey == 'citations') {
      accessory = <EntityCitationsAccessory entityId={docId} />
    } else if (
      accessoryKey == 'comments' &&
      id &&
      document.data?.version
    ) {
      accessory = (
        <EntityCommentsAccessory
          id={id}
          activeVersion={document.data?.version}
        />
      )
    }
    return (
      <ErrorBoundary
        FallbackComponent={AppErrorPage}
        onReset={() => document.refetch()}
      >
        {pushToGatewayDialog.content}
        <CitationsProvider
          documentId={docId}
          onCitationsOpen={() => {
            // todo, pass active citations into route
            replace({ ...route, accessory: { key: 'citations' } })
          }}
        >
          <AccessoryLayout accessory={accessory}>
            <MainWrapper>
              <YStack
                paddingVertical="$7"
                width="100%"
                maxWidth="90ch"
                alignSelf="center"
              >
                <AppDocContentProvider
                  citations={mentions.data?.mentions}
                  onCitationClick={() => {
                    if (route.accessory?.key === 'citations')
                      return replace({ ...route, accessory: null })
                    replace({ ...route, accessory: { key: 'citations' } })
                  }}
                  onBlockComment={(blockId, blockRange) => {
                    replace({ ...route, accessory: { key: 'comments' } })
                    const version = document.data?.version
                    if (!id) throw new Error('invalid doc id')
                    if (!version)
                      throw new Error('no publication version for commenting')
                    createComment(
                      id.eid,
                      version,
                      undefined,
                      createHmId('d', id.eid, {
                        version,
                        blockRef: blockId,
                        blockRange,
                      }),
                    )
                  }}
                >
                  <DocHeading
                    right={
                      <XStack
                        gap="$2"
                      // opacity={0}
                      // $group-header-hover={{opacity: 1}}
                      >
                        {id && (
                          <FavoriteButton url={createHmId('d', id.eid, {})} />
                        )}
                        <CopyReferenceButton />
                      </XStack>
                    }
                  >
                    {document.data?.document?.title}
                  </DocHeading>
                  {document.data ? (
                    <>
                      <DocumentPageMeta
                        document={document.data}
                      />
                      <DocContent
                        ref={rangeRef}
                        document={document.data}
                        focusBlockId={
                          route?.isBlockFocused ? route.blockId : undefined
                        }
                      />
                    </>
                  ) : null}
                </AppDocContentProvider>
              </YStack>
              {/* {route.versionId && (
                    <OutOfDateBanner docId={docId} version={route.versionId} />
                  )} */}
            </MainWrapper>
          </AccessoryLayout>
          <Footer>
            {document.data && (
              <DocumentVersionsFooterButton
                variantVersion={document.data?.version}
              />
            )}

            {mentions.data?.mentions?.length ? (
              <FooterButton
                active={accessoryKey === 'citations'}
                label={`${mentions.data?.mentions?.length} ${pluralS(
                  mentions.data?.mentions?.length,
                  'Citation',
                )}`}
                icon={BlockQuote}
                onPress={() => {
                  if (route.accessory?.key === 'citations')
                    return replace({ ...route, accessory: null })
                  replace({ ...route, accessory: { key: 'citations' } })
                }}
              />
            ) : null}

            <PublicationCommentaryButton />
          </Footer>
        </CitationsProvider>
      </ErrorBoundary>
    )
  }

  return null
  // TODO: show loading only if it takes more than 1 second to load the publication
  // return <DocumentPlaceholder />
}

function PublicationCommentaryButton() {
  const route = useNavRoute()
  if (route.key !== 'document')
    throw new Error('Document page expects document route')

  const docId = route?.documentId ? unpackHmId(route?.documentId) : null
  const accessory = route?.accessory
  const accessoryKey = accessory?.key
  const replace = useNavigate('replace')
  let label = 'Comment'
  const comments = useAllPublicationComments(docId?.eid)
  if (comments.data?.length) {
    label = `${comments.data.length} ${pluralS(
      comments.data.length,
      'Comment',
    )}`
  }
  return (
    <FooterButton
      label={label}
      icon={MessageSquare}
      active={accessoryKey === 'comments'}
      onPress={() => {
        if (route.accessory?.key === 'comments')
          return replace({ ...route, accessory: null })
        replace({ ...route, accessory: { key: 'comments' } })
      }}
    />
  )
}

function DocumentVersionsFooterButton({
  variantVersion,
}: {
  variantVersion: string
}) {
  const route = useNavRoute()
  if (route.key !== 'document')
    throw new Error('Document page expects document route')
  const docId = route?.documentId
  const accessory = route?.accessory
  const accessoryKey = accessory?.key
  const replace = useNavigate('replace')
  const changes = useDocHistory(docId, variantVersion)
  return (
    <FooterButton
      active={accessoryKey === 'versions'}
      label={`${changes?.length} ${pluralS(changes?.length, 'Version')}`}
      icon={History}
      onPress={() => {
        if (route.accessory?.key === 'versions')
          return replace({ ...route, accessory: null })
        replace({ ...route, accessory: { key: 'versions' } })
      }}
    />
  )
}

function DocumentPageMeta({ document }: { document: HMDocument }) {
  const editors = useAccounts(document.document?.editors || [])
  const navigate = useNavigate()

  return (
    <YStack
      ai="flex-start"
      paddingHorizontal="$2"
      borderBottomColor="$color6"
      borderBottomWidth={1}
      paddingBottom="$2"
      userSelect="none"
    >
      <XStack flexWrap="wrap">
        <XStack marginHorizontal="$4" gap="$2" ai="center" paddingVertical="$2">
          <XStack ai="center">
            {editors
              .map((editor) => editor.data)
              .filter(Boolean)
              .map(
                (editorAccount, idx) =>
                  editorAccount?.id && (
                    <XStack
                      zIndex={idx + 1}
                      key={editorAccount?.id}
                      borderColor="$background"
                      backgroundColor="$background"
                      borderWidth={2}
                      borderRadius={100}
                      marginLeft={-8}
                    >
                      <BaseAccountLinkAvatar
                        account={editorAccount}
                        accountId={editorAccount?.id}
                      />
                    </XStack>
                  ),
              )}
          </XStack>
          <SizableText flexWrap="wrap">
            {editors
              .map((editor) => editor.data)
              .filter(Boolean)
              .map((account, index) => [
                account ? (
                  <ButtonText
                    key={account.id}
                    fontWeight={'bold'}
                    onPress={() => {
                      navigate({ key: 'account', accountId: account.id })
                    }}
                    hoverStyle={{
                      textDecorationLine: 'underline',
                    }}
                  >
                    {getProfileName(account.profile)}
                  </ButtonText>
                ) : null,
                index !== editors.length - 1 ? (
                  index === editors.length - 2 ? (
                    <Text fontWeight={'bold'}>{' & '}</Text>
                  ) : (
                    <Text fontWeight={'bold'}>{', '}</Text>
                  )
                ) : null,
              ])
              .filter(Boolean)}
          </SizableText>
        </XStack>
        <XStack ai="center">
          <Text marginHorizontal="$4" color="$color10">
            {formattedDateMedium(document?.publishTime)}
          </Text>
        </XStack>
      </XStack>
    </YStack>
  )
}
