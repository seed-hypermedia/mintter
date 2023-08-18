import {AppBanner, BannerText} from '@mintter/app/src/components/app-banner'
import {VersionsAccessory} from '@mintter/app/src/components/changes-list'
import {CitationsAccessory} from '@mintter/app/src/components/citations'
import Footer, {FooterButton} from '@mintter/app/src/components/footer'
import {Placeholder} from '@mintter/app/src/components/placeholder-box'
import {features} from '@mintter/app/src/constants'
import {useDocChanges} from '@mintter/app/src/models/changes'
import {useDocCitations} from '@mintter/app/src/models/content-graph'
import {
  usePublication,
  usePublicationEditor,
} from '@mintter/app/src/models/documents'
import {useNavRoute, useNavigate} from '@mintter/app/src/utils/navigation'
import {MttLink, pluralS} from '@mintter/shared'
import {
  Button,
  Comment,
  Link,
  MainWrapper,
  Pencil,
  Text,
  YStack,
} from '@mintter/ui'
import {Allotment} from 'allotment'
import 'allotment/dist/style.css'
import {useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'

import {AppError} from '@mintter/app/src/components/app-error'
import {CitationsProvider} from '@mintter/app/src/components/citations-context'
import {DebugData} from '@mintter/app/src/components/debug-data'
import {
  HDEditorContainer,
  HyperDocsEditorView,
} from '@mintter/app/src/editor/editor'
import {useLatestPublication} from '../models/documents'

export default function PublicationPage() {
  const route = useNavRoute()
  if (route.key !== 'publication')
    throw new Error('Publication page expects publication actor')

  const docId = route?.documentId
  const versionId = route?.versionId
  const blockId = route?.blockId
  const accessory = route?.accessory
  const accessoryKey = accessory?.key
  const replace = useNavigate('replace')
  if (!docId)
    throw new Error(
      `Publication route does not contain docId: ${JSON.stringify(route)}`,
    )
  const {editor, data, status, error, refetch} = usePublicationEditor(
    docId,
    versionId,
  )

  // this checks if there's a block in the url, so we can highlight and scroll into the selected block
  let [focusBlock] = useState(() => blockId)

  // useScrollToBlock(editor, scrollWrapperRef, focusBlock)

  const {data: changes} = useDocChanges(status == 'success' ? docId : undefined)
  const {data: citations} = useDocCitations(
    status == 'success' ? docId : undefined,
  )

  if (status == 'error') {
    return (
      <YStack>
        <YStack gap="$3" alignItems="flex-start" maxWidth={500} padding="$8">
          <Text fontFamily="$body" fontWeight="700" fontSize="$6">
            Publication ERROR
          </Text>
          <Text fontFamily="$body" fontSize="$4">
            {JSON.stringify(error)}
          </Text>
          <Button theme="yellow" onPress={() => refetch()}>
            try again
          </Button>
        </YStack>
      </YStack>
    )
  }

  if (status == 'success') {
    return (
      <ErrorBoundary
        FallbackComponent={AppError}
        onReset={() => window.location.reload()}
      >
        <CitationsProvider
          documentId={docId}
          onCitationsOpen={(citations: Array<MttLink>) => {
            // todo, pass active citations into route
            replace({...route, accessory: {key: 'citations'}})
          }}
        >
          <Allotment defaultSizes={[100]}>
            <Allotment.Pane>
              <YStack height="100%">
                <MainWrapper>
                  {editor && (
                    <HDEditorContainer>
                      <HyperDocsEditorView editor={editor} />
                      <DebugData data={data} />
                    </HDEditorContainer>
                  )}

                  {versionId && (
                    <OutOfDateBanner docId={docId} version={versionId} />
                  )}
                </MainWrapper>
              </YStack>
            </Allotment.Pane>
            {accessoryKey &&
              (accessoryKey == 'versions' ? (
                <VersionsAccessory />
              ) : (
                <CitationsAccessory docId={docId} version={versionId} />
              ))}
          </Allotment>

          <Footer>
            <FooterButton
              active={accessoryKey === 'versions'}
              label={`${changes?.changes?.length} ${pluralS(
                changes?.changes?.length,
                'Version',
              )}`}
              icon={Pencil}
              onPress={() => {
                if (route.accessory) return replace({...route, accessory: null})
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
                  if (route.accessory)
                    return replace({...route, accessory: null})
                  replace({...route, accessory: {key: 'citations'}})
                }}
              />
            ) : null}
            {features.comments ? (
              <FooterButton
                active={accessoryKey === 'comments'}
                label={`Conversations`}
                icon={Comment}
                onPress={() => {
                  if (route.accessory?.key === 'versions')
                    return replace({...route, accessory: null})
                  replace({...route, accessory: {key: 'comments'}})
                }}
              />
            ) : null}
          </Footer>
        </CitationsProvider>
      </ErrorBoundary>
    )
  }

  return (
    <>
      <PublicationShell />

      {/* <p
        className={classnames('publication-fetching-message', {
          visible: state.matches('fetching.extended'),
        })}
      >
        Searching the network...
      </p> */}
    </>
  )
}

function PublicationShell() {
  // TODO: update shell
  return (
    <YStack
      marginTop="$7"
      width="100%"
      maxWidth="600px"
      gap="$6"
      marginHorizontal="auto"
    >
      <BlockPlaceholder />
      <BlockPlaceholder />
      <BlockPlaceholder />
      <BlockPlaceholder />
      <BlockPlaceholder />
    </YStack>
  )
}

function BlockPlaceholder() {
  return (
    <YStack width="600px" gap="$2">
      <Placeholder width="100%" />
      <Placeholder width="92%" />
      <Placeholder width="84%" />
      <Placeholder width="90%" />
    </YStack>
  )
}

type ActivePanel = 'conversations' | 'citations' | 'changes' | undefined

type ResizablePanelMachineContext = {
  show: boolean
  activePanel: ActivePanel
  left: number
}

type ResizablePanelMachineEvent =
  | {type: 'PANEL.TOGGLE'; activePanel?: ActivePanel}
  | {type: 'PANEL.OPEN'; activePanel?: ActivePanel}
  | {type: 'PANEL.CLOSE'}
  | {type: 'PANEL.RESIZE'; values: Array<number>}

type ResizablePanelMachineServices = {
  matchMediaService: {
    data: void
  }
}

// eslint-disable-next-line
// function useScrollToBlock(editor: SlateEditor, ref: any, blockId?: string) {
//   // TODO: find a way to scroll to the block when clicking on a mintter link
//   useEffect(() => {
//     setTimeout(() => {
//       if (blockId) {
//         if (ref?.current) {
//           let entry = getEditorBlock(editor, {id: blockId})

//           if (entry) {
//             let [block] = entry
//             let elm = ReactEditor.toDOMNode(editor, block)

//             let rect = elm.getBoundingClientRect()
//             let wrapper = ref.current.getBoundingClientRect()
//             ref.current.scrollTo({top: rect.top - wrapper.top - 24})
//           }
//         }
//       }
//     }, 1000)
//   }, [ref, blockId, editor])
// }

function OutOfDateBanner({docId, version}: {docId: string; version: string}) {
  const route = useNavRoute()
  const context = route.key === 'publication' ? route.pubContext : undefined
  const {data: pub, isLoading} = useLatestPublication({
    trustedVersionsOnly: context?.key === 'trusted',
    documentId: docId,
    enabled: !!docId,
  })

  const navigate = useNavigate()
  const pubAccessory = route.key === 'publication' ? route.accessory : undefined
  if (isLoading) return null
  if (version === pub?.version) return null
  if (!pub?.version) return null
  return (
    <AppBanner
      onPress={() => {
        navigate({
          key: 'publication',
          documentId: docId,
          versionId: pub.version,
          accessory: pubAccessory,
        })
      }}
    >
      <BannerText>
        There is a newer {context === 'trusted' ? 'trusted version' : 'version'}{' '}
        of this Publication. Click here to go to latest →
      </BannerText>
    </AppBanner>
  )
}
