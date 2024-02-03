import {AppErrorPage} from '@mintter/app/components/app-error'
import {CitationsAccessory} from '@mintter/app/components/citations'
import {CitationsProvider} from '@mintter/app/components/citations-context'
import Footer, {FooterButton} from '@mintter/app/components/footer'
import {useDocCitations} from '@mintter/app/models/content-graph'
import {useNavRoute} from '@mintter/app/utils/navigation'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {
  MttLink,
  Publication,
  PublicationContent,
  PublicationHeading,
  createHmId,
  formattedDateMedium,
  pluralS,
  unpackDocId,
  unpackHmId,
} from '@mintter/shared'
import {
  BlockQuote,
  Button,
  ButtonText,
  Separator,
  SizableText,
  Text,
  XStack,
  YStack,
} from '@mintter/ui'
import {History, MessageSquare} from '@tamagui/lucide-icons'
import {Allotment} from 'allotment'
import 'allotment/dist/style.css'
import {useCallback, useEffect} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {BaseAccountLinkAvatar} from '../components/account-link-avatar'
import {EntityVersionsAccessory} from '../components/changes-list'
import {EntityCommentsAccessory} from '../components/comments'
import {PushToGatewayDialog} from '../components/copy-gateway-reference'
import {useAppDialog} from '../components/dialog'
import {FirstPublishDialog} from '../components/first-publish-dialog'
import {MainWrapper} from '../components/main-wrapper'
import {PinDocumentButton} from '../components/pin-entity'
import {CopyReferenceButton} from '../components/titlebar-common'
import {useAccounts} from '../models/accounts'
import {useDocHistory} from '../models/changes'
import {useAllPublicationComments, useCreateComment} from '../models/comments'
import {useExperiments} from '../models/experiments'
import {useGatewayHost} from '../models/gateway-settings'
import {useCurrentDocumentGroups, useGroup} from '../models/groups'
import {usePublicationVariant} from '../models/publication'
import {getAccountName} from './account-page'
import {AppPublicationContentProvider} from './publication-content-provider'

function PublicationPageMeta({publication}: {publication: Publication}) {
  const editors = useAccounts(publication.document?.editors || [])
  const navigate = useNavigate()
  const docGroups = useCurrentDocumentGroups(publication.document?.id)
  const selectedGroups = docGroups.data?.filter((groupItem) => {
    const groupItemId = unpackDocId(groupItem.rawUrl)
    return !!groupItemId?.version && groupItemId.version === publication.version
  })
  return (
    <YStack
      ai="flex-start"
      paddingHorizontal="$3"
      borderBottomColor="$color6"
      borderBottomWidth={1}
      paddingBottom="$4"
      userSelect="none"
    >
      <XStack separator={<Separator vertical />} flexWrap="wrap">
        <XStack marginHorizontal="$4" gap="$2" ai="center" paddingVertical="$2">
          <XStack ai="center" marginLeft={8}>
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
                      navigate({key: 'account', accountId: account.id})
                    }}
                    hoverStyle={{
                      textDecorationLine: 'underline',
                    }}
                  >
                    {getAccountName(account.profile)}
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
          <Text marginHorizontal="$4" color="$color10" verticalAlign="middle">
            {formattedDateMedium(publication.document?.publishTime)}
          </Text>
        </XStack>
        {selectedGroups?.length ? (
          <XStack gap="$2" marginHorizontal="$4" ai="center" flexWrap="wrap">
            {selectedGroups.map((selectedGroup) => (
              <PublicationGroup
                key={selectedGroup.groupId}
                groupId={selectedGroup.groupId}
              />
            ))}
          </XStack>
        ) : null}
      </XStack>
    </YStack>
  )
}

function PublicationGroup({groupId}: {groupId: string}) {
  const group = useGroup(groupId)
  const navigate = useNavigate()
  if (!group.data?.title) return null
  return (
    <Button
      chromeless
      borderColor="$color8"
      size="$2"
      onPress={() => {
        navigate({
          key: 'group',
          groupId,
        })
      }}
    >
      {group.data.title}
    </Button>
  )
}

export default function PublicationPage() {
  const route = useNavRoute()
  if (route.key !== 'publication')
    throw new Error('Publication page expects publication actor')

  const docId = route?.documentId
  const accessory = route?.accessory
  const accessoryKey = accessory?.key
  const replace = useNavigate('replace')
  if (!docId)
    throw new Error(
      `Publication route does not contain docId: ${JSON.stringify(route)}`,
    )
  const publication = usePublicationVariant({
    documentId: docId,
    versionId: route.versionId,
    variant: route.variant,
  })

  const {data: citations} = useDocCitations(
    publication.status == 'success' ? docId : undefined,
  )

  const firstPubDialog = useAppDialog(FirstPublishDialog, {
    onClose: useCallback(() => {
      replace({...route, showFirstPublicationMessage: false})
    }, [replace, route]),
  })

  const showFirstPublicationMessage = route.showFirstPublicationMessage
  const pubVersion = publication.data?.publication?.version
  useEffect(() => {
    if (showFirstPublicationMessage && pubVersion) {
      firstPubDialog.open({route, version: pubVersion})
    }
  }, [firstPubDialog, showFirstPublicationMessage, route, pubVersion])

  const id = unpackDocId(docId)
  const experiments = useExperiments()
  const createComment = useCreateComment()
  const pushToGatewayDialog = useAppDialog(PushToGatewayDialog, {
    onClose: () => {
      if (route.immediatelyPromptPush) {
        replace({...route, immediatelyPromptPush: false})
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

  if (publication.data) {
    return (
      <ErrorBoundary
        FallbackComponent={AppErrorPage}
        onReset={() => publication.refetch()}
      >
        {firstPubDialog.content}
        {pushToGatewayDialog.content}
        <CitationsProvider
          documentId={docId}
          onCitationsOpen={(citations: Array<MttLink>) => {
            // todo, pass active citations into route
            replace({...route, accessory: {key: 'citations'}})
          }}
        >
          <Allotment
            key={`${accessory}`}
            defaultSizes={accessory ? [65, 35] : [100]}
          >
            <Allotment.Pane>
              <YStack height="100%">
                <MainWrapper>
                  <YStack
                    paddingBottom={'$7'}
                    width="100%"
                    maxWidth="90ch"
                    // paddingHorizontal="10vw"
                    alignSelf="center"
                  >
                    <AppPublicationContentProvider
                      citations={citations?.links}
                      onCitationClick={() => {
                        if (route.accessory?.key === 'citations')
                          return replace({...route, accessory: null})
                        replace({...route, accessory: {key: 'citations'}})
                      }}
                      onBlockComment={
                        experiments.data?.commenting
                          ? (blockId) => {
                              replace({...route, accessory: {key: 'comments'}})
                              const version =
                                publication.data?.publication?.version
                              if (!id) throw new Error('invalid doc id')
                              if (!version)
                                throw new Error(
                                  'no publication version for commenting',
                                )
                              createComment(
                                id.eid,
                                version,
                                undefined,
                                createHmId('d', id.eid, {
                                  version,
                                  blockRef: blockId,
                                }),
                              )
                            }
                          : null
                      }
                    >
                      <PublicationHeading
                        right={
                          <XStack
                            gap="$2"
                            // opacity={0}
                            // $group-header-hover={{opacity: 1}}
                          >
                            <PinDocumentButton route={route} />
                            <CopyReferenceButton />
                          </XStack>
                        }
                      >
                        {publication.data?.publication?.document?.title}
                      </PublicationHeading>
                      {publication.data?.publication ? (
                        <>
                          <PublicationPageMeta
                            publication={publication.data?.publication}
                          />
                          <PublicationContent
                            publication={publication.data?.publication}
                          />
                        </>
                      ) : null}
                    </AppPublicationContentProvider>
                  </YStack>
                  {/* {route.versionId && (
                    <OutOfDateBanner docId={docId} version={route.versionId} />
                  )} */}
                </MainWrapper>
              </YStack>
            </Allotment.Pane>

            {accessoryKey == 'versions' ? (
              <EntityVersionsAccessory
                id={unpackDocId(docId)}
                variantVersion={publication.data?.variantVersion}
                activeVersion={publication.data?.publication?.version}
              />
            ) : null}
            {accessoryKey == 'citations' ? (
              <CitationsAccessory docId={docId} />
            ) : null}
            {accessoryKey == 'comments' &&
            id &&
            publication.data?.publication?.version ? (
              <EntityCommentsAccessory
                id={id}
                activeVersion={publication.data?.publication?.version}
              />
            ) : null}
          </Allotment>
          <Footer>
            {publication.data?.variantVersion && (
              <PublicationVersionsFooterButton
                variantVersion={publication.data?.variantVersion}
              />
            )}

            {citations?.links?.length ? (
              <FooterButton
                active={accessoryKey === 'citations'}
                label={`${citations?.links?.length} ${pluralS(
                  citations?.links?.length,
                  'Citation',
                )}`}
                icon={BlockQuote}
                onPress={() => {
                  if (route.accessory?.key === 'citations')
                    return replace({...route, accessory: null})
                  replace({...route, accessory: {key: 'citations'}})
                }}
              />
            ) : null}

            {experiments.data?.commenting ? (
              <PublicationCommentaryButton />
            ) : null}
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
  if (route.key !== 'publication')
    throw new Error('Publication page expects publication actor')

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
          return replace({...route, accessory: null})
        replace({...route, accessory: {key: 'comments'}})
      }}
    />
  )
}

function PublicationVersionsFooterButton({
  variantVersion,
}: {
  variantVersion: string
}) {
  const route = useNavRoute()
  if (route.key !== 'publication')
    throw new Error('Publication page expects publication actor')
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
          return replace({...route, accessory: null})
        replace({...route, accessory: {key: 'versions'}})
      }}
    />
  )
}
