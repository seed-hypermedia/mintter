import {AppErrorPage} from '@mintter/app/components/app-error'
import {CitationsAccessory} from '@mintter/app/components/citations'
import {CitationsProvider} from '@mintter/app/components/citations-context'
import Footer, {FooterButton} from '@mintter/app/components/footer'
import {useDocChanges} from '@mintter/app/models/changes'
import {useDocCitations} from '@mintter/app/models/content-graph'
import {useNavRoute} from '@mintter/app/utils/navigation'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {
  BACKEND_FILE_URL,
  MttLink,
  Publication,
  PublicationContent,
  PublicationContentContextValue,
  PublicationContentProvider,
  PublicationHeading,
  contentLayoutUnit,
  contentTextUnit,
  formattedDateMedium,
  pluralS,
  unpackDocId,
} from '@mintter/shared'
import {ButtonText, Link, Separator, Text, XStack, YStack} from '@mintter/ui'
import {History} from '@tamagui/lucide-icons'
import {Allotment} from 'allotment'
import 'allotment/dist/style.css'
import {useCallback, useEffect} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {useAppContext} from '../app-context'
import {BaseAccountLinkAvatar} from '../components/account-link-avatar'
import {
  EmbedAccount,
  EmbedGroup,
  EmbedPublicationCard,
  EmbedPublicationContent,
} from '../components/app-embeds'
import {EntityVersionsAccessory} from '../components/changes-list'
import {useAppDialog} from '../components/dialog'
import {FirstPublishDialog} from '../components/first-publish-dialog'
import {MainWrapper} from '../components/main-wrapper'
import {PinDocumentButton} from '../components/pin-entity'
import {useFullReferenceUrl} from '../components/titlebar-common'
import {VersionChangesInfo} from '../components/version-changes-info'
import {copyUrlToClipboardWithFeedback} from '../copy-to-clipboard'
import {useAccounts} from '../models/accounts'
import {useExperiments} from '../models/experiments'
import {usePublicationVariant} from '../models/publication'
import {useOpenUrl} from '../open-url'

export function AppPublicationContentProvider({
  children,
  ...overrides
}: React.PropsWithChildren<Partial<PublicationContentContextValue>>) {
  const {saveCidAsFile} = useAppContext()
  const openUrl = useOpenUrl()
  const route = useNavRoute()
  const reference = useFullReferenceUrl(route)
  const experiments = useExperiments()
  return (
    <PublicationContentProvider
      showDevMenu={experiments.data?.pubContentDevMenu}
      layoutUnit={contentLayoutUnit}
      textUnit={contentTextUnit}
      debug={false}
      entityComponents={{
        AccountCard: EmbedAccount,
        GroupCard: EmbedGroup,
        PublicationCard: EmbedPublicationCard,
        PublicationContent: EmbedPublicationContent,
      }}
      onLinkClick={(href, e) => {
        e.preventDefault()
        e.stopPropagation()
        openUrl(href)
      }}
      onCopyBlock={(blockId: string) => {
        if (blockId && reference?.url) {
          const url = `${reference.url}#${blockId}`
          copyUrlToClipboardWithFeedback(url, reference?.label)
        }
      }}
      ipfsBlobPrefix={`${BACKEND_FILE_URL}/`}
      saveCidAsFile={saveCidAsFile}
      {...overrides}
    >
      {children}
    </PublicationContentProvider>
  )
}

function PublicationPageMeta({publication}: {publication: Publication}) {
  const editors = useAccounts(publication.document?.editors || [])
  const navigate = useNavigate()
  return (
    <YStack
      ai="flex-start"
      paddingHorizontal="$3"
      borderBottomColor="$color6"
      borderBottomWidth={1}
      paddingBottom="$4"
    >
      <XStack separator={<Separator vertical />} flexWrap="wrap">
        <XStack marginHorizontal="$4" gap="$2" ai="center" paddingVertical="$2">
          <XStack ai="center" marginLeft={8}>
            {editors
              .map((editor) => editor.data)
              .filter(Boolean)
              .map((editorAccount, idx) => (
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
              ))}
          </XStack>
          <Text fontWeight={'bold'}>
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
                    {account.profile?.alias}
                  </ButtonText>
                ) : null,
                index !== editors.length - 1
                  ? index === editors.length - 2
                    ? ' & '
                    : ', '
                  : null,
              ])
              .filter(Boolean)}
          </Text>
        </XStack>
        <XStack ai="center">
          <Text marginHorizontal="$4" color="$color10" verticalAlign="middle">
            {formattedDateMedium(publication.document?.publishTime)}
          </Text>
        </XStack>
      </XStack>
    </YStack>
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

  const {data: changes} = useDocChanges(
    publication.status == 'success' ? docId : undefined,
  )
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

  if (publication.data) {
    return (
      <ErrorBoundary
        FallbackComponent={AppErrorPage}
        onReset={() => publication.refetch()}
      >
        {firstPubDialog.content}
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
                    >
                      <PublicationHeading
                        right={
                          <XStack
                            gap="$2"
                            opacity={0}
                            $group-header-hover={{opacity: 1}}
                          >
                            <PinDocumentButton route={route} />
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
            {accessoryKey &&
              (accessoryKey == 'versions' ? (
                <EntityVersionsAccessory
                  id={unpackDocId(docId)}
                  variantVersion={publication.data?.variantVersion}
                  activeVersion={publication.data?.publication?.version}
                />
              ) : (
                <CitationsAccessory docId={docId} />
              ))}
          </Allotment>
          <Footer>
            <XStack gap="$3" marginHorizontal="$3">
              {publication.data?.publication?.version && (
                <VersionChangesInfo
                  version={publication.data?.publication?.version}
                />
              )}
            </XStack>

            <FooterButton
              active={accessoryKey === 'versions'}
              label={`${changes?.changes?.length} ${pluralS(
                changes?.changes?.length,
                'Version',
              )}`}
              icon={History}
              onPress={() => {
                if (route.accessory?.key === 'versions')
                  return replace({...route, accessory: null})
                replace({...route, accessory: {key: 'versions'}})
              }}
            />

            {citations?.links?.length ? (
              <FooterButton
                active={accessoryKey === 'citations'}
                label={`${citations?.links?.length} ${pluralS(
                  citations?.links?.length,
                  'Citation',
                )}`}
                icon={Link}
                onPress={() => {
                  if (route.accessory?.key === 'citations')
                    return replace({...route, accessory: null})
                  replace({...route, accessory: {key: 'citations'}})
                }}
              />
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

// function OutOfDateBanner({docId, version}: {docId: string; version: string}) {
//   const route = useNavRoute()
//   const pubRoute = route.key === 'publication' ? route : undefined
//   const pubContext = pubRoute?.pubContext
//   const pub = usePublicationVariant({documentId: docId, pubContext})

//   const navigate = useNavigate()
//   const pubAccessory = route.key === 'publication' ? route.accessory : undefined
//   if (pub.isLoading) return null
//   if (version === pub?.data?.version) return null
//   if (pub?.data?.version) return null
//   return (
//     <AppBanner
//       onPress={() => {
//         navigate({
//           key: 'publication',
//           documentId: docId,
//           accessory: pubAccessory,
//           pubContext,
//         })
//       }}
//     >
//       <BannerText>
//         There is a newer{' '}
//         {pubContext?.key === 'trusted' ? 'trusted version' : 'version'} of this
//         Publication{pubContext?.key === 'group' ? ' in this group' : ''}. Click
//         here to go to latest →
//       </BannerText>
//     </AppBanner>
//   )
// }

function usePublicationCitations(docId?: string) {
  return useDocCitations(docId)
}
