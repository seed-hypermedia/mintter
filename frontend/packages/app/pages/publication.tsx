import {AppBanner, BannerText} from '@mintter/app/components/app-banner'
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
  PublicationContent,
  PublicationContentContextValue,
  PublicationContentProvider,
  PublicationHeading,
  pluralS,
  unpackDocId,
} from '@mintter/shared'
import {Link, XStack, YStack} from '@mintter/ui'
import {History} from '@tamagui/lucide-icons'
import {Allotment} from 'allotment'
import 'allotment/dist/style.css'
import {useCallback, useEffect} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {useAppContext} from '../app-context'
import {
  EmbedAccount,
  EmbedGroup,
  EmbedPublication,
} from '../components/app-embeds'
import {EntityVersionsAccessory} from '../components/changes-list'
import {useAppDialog} from '../components/dialog'
import {FirstPublishDialog} from '../components/first-publish-dialog'
import {MainWrapper} from '../components/main-wrapper'
import {PinDocumentButton} from '../components/pin-entity'
import {useFullReferenceUrl} from '../components/titlebar-common'
import {VersionChangesInfo} from '../components/version-changes-info'
import {copyUrlToClipboardWithFeedback} from '../copy-to-clipboard'
import appError from '../errors'
import {useExperiments} from '../models/experiments'
import {usePublicationInContext} from '../models/publication'
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
      entityComponents={{
        AccountCard: EmbedAccount,
        GroupCard: EmbedGroup,
        PublicationCard: EmbedPublication,
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
  const publication = usePublicationInContext({
    documentId: docId,
    versionId: route.versionId,
    pubContext: route.pubContext,
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
  const pubVersion = publication.data?.version
  useEffect(() => {
    if (showFirstPublicationMessage && pubVersion) {
      firstPubDialog.open({route, version: pubVersion})
    }
  }, [showFirstPublicationMessage, route, pubVersion])

  if (publication.data) {
    return (
      <ErrorBoundary
        FallbackComponent={AppErrorPage}
        onReset={() => publication.refetch()}
      >
        <button onClick={() => appError('Fake Error!')}>fake error</button>
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
                        {publication.data.document?.title}
                      </PublicationHeading>

                      <PublicationContent publication={publication.data} />
                    </AppPublicationContentProvider>
                  </YStack>
                  {route.versionId && (
                    <OutOfDateBanner docId={docId} version={route.versionId} />
                  )}
                </MainWrapper>
              </YStack>
            </Allotment.Pane>
            {accessoryKey &&
              (accessoryKey == 'versions' ? (
                <EntityVersionsAccessory
                  id={unpackDocId(docId)}
                  activeVersion={publication.data.version}
                />
              ) : (
                <CitationsAccessory docId={docId} />
              ))}
          </Allotment>
          <Footer>
            <XStack gap="$3" marginHorizontal="$3">
              {publication.data?.version && (
                <VersionChangesInfo version={publication.data?.version} />
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

function OutOfDateBanner({docId, version}: {docId: string; version: string}) {
  const route = useNavRoute()
  const pubRoute = route.key === 'publication' ? route : undefined
  const pubContext = pubRoute?.pubContext
  const pub = usePublicationInContext({documentId: docId, pubContext})

  const navigate = useNavigate()
  const pubAccessory = route.key === 'publication' ? route.accessory : undefined
  if (pub.isLoading) return null
  if (version === pub?.data?.version) return null
  if (pub?.data?.version) return null
  return (
    <AppBanner
      onPress={() => {
        navigate({
          key: 'publication',
          documentId: docId,
          accessory: pubAccessory,
          pubContext,
        })
      }}
    >
      <BannerText>
        There is a newer{' '}
        {pubContext?.key === 'trusted' ? 'trusted version' : 'version'} of this
        Publication{pubContext?.key === 'group' ? ' in this group' : ''}. Click
        here to go to latest →
      </BannerText>
    </AppBanner>
  )
}

function usePublicationCitations(docId?: string) {
  return useDocCitations(docId)
}
