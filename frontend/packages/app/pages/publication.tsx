import {AppErrorPage} from '@mintter/app/components/app-error'
import {CitationsProvider} from '@mintter/app/components/citations-context'
import Footer, {FooterButton} from '@mintter/app/components/footer'
import {useEntityMentions} from '@mintter/app/models/content-graph'
import {useNavRoute} from '@mintter/app/utils/navigation'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {
  Document,
  DocumentChange,
  HMGroup,
  Publication,
  PublicationContent,
  PublicationHeading,
  UnpackedDocId,
  createHmId,
  formattedDateMedium,
  hmGroup,
  pluralS,
  unpackDocId,
  unpackHmId,
} from '@mintter/shared'
import {
  Add,
  BlockQuote,
  Button,
  ButtonText,
  Check as CheckIcon,
  Checkbox,
  ChevronDown,
  ChevronUp,
  DialogDescription,
  Input,
  Label,
  RadioGroup,
  Select,
  SizableText,
  Text,
  Tooltip,
  XStack,
  YStack,
} from '@mintter/ui'
import {History, MessageSquare} from '@tamagui/lucide-icons'
import 'allotment/dist/style.css'
import {nanoid} from 'nanoid'
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import {Spinner} from 'tamagui'
import {useGRPCClient} from '../app-context'
import {AccessoryLayout} from '../components/accessory-sidebar'
import {BaseAccountLinkAvatar} from '../components/account-link-avatar'
import {EntityVersionsAccessory} from '../components/changes-list'
import {EntityCitationsAccessory} from '../components/citations'
import {EntityCommentsAccessory} from '../components/comments'
import {PushToGatewayDialog} from '../components/copy-gateway-reference'
import {DialogTitle, useAppDialog} from '../components/dialog'
import {FavoriteButton} from '../components/favoriting'
import {FirstPublishDialog} from '../components/first-publish-dialog'
import {MainWrapper} from '../components/main-wrapper'
import {CopyReferenceButton} from '../components/titlebar-common'
import {useAccounts, useMyAccount} from '../models/accounts'
import {useDocHistory} from '../models/changes'
import {useAllPublicationComments, useCreateComment} from '../models/comments'
import {useGatewayHost} from '../models/gateway-settings'
import {
  useAccountGroups,
  useCurrentDocumentGroups,
  useDocumentGroups,
  useGroup,
} from '../models/groups'
import {usePublicationVariant} from '../models/publication'
import {consumePublicationPrompt} from '../src/publication-prompt'
import {pathNameify} from '../utils/path'
import {getAccountName} from './account-page'
import {AppPublicationContentProvider} from './publication-content-provider'

export default function PublicationPage() {
  const route = useNavRoute()
  if (route.key !== 'publication')
    throw new Error('Publication page expects publication route')

  const docId = route?.documentId
  const publicationPrompt = useRef<any>(null)
  const pubPromptDialog = useAppDialog(PublicationPrompt)
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
    variants: route.variants,
  })

  const grouppps = useDocumentGroups(docId)

  console.log(`== ~ PublicationPage ~ grouppps:`, docId, grouppps.data)

  const mentions = useEntityMentions(
    publication.status == 'success' ? docId : undefined,
  )
  const firstPubDialog = useAppDialog(FirstPublishDialog, {
    onClose: useCallback(() => {
      replace({...route, showFirstPublicationMessage: false})
      if (publicationPrompt.current) {
        console.log('=== PROMPT: data', publicationPrompt)
        publicationPrompt.current = null
        pubPromptDialog.open({
          docId,
          version: route.versionId,
          title: publication.data.publication?.document?.title,
          afterPublish: true,
        })
      }
    }, [replace, route]),
  })

  const showFirstPublicationMessage = route.showFirstPublicationMessage
  const pubVersion = publication.data?.publication?.version
  useEffect(() => {
    if (showFirstPublicationMessage && pubVersion) {
      firstPubDialog.open({route, version: pubVersion})
    } else if (publicationPrompt.current) {
      console.log('=== PROMPT: data', publicationPrompt)
      publicationPrompt.current = null
      pubPromptDialog.open({
        docId,
        version: route.versionId,
        title: publication.data.publication?.document?.title,
        afterPublish: true,
      })
    }
  }, [firstPubDialog, showFirstPublicationMessage, route, pubVersion])

  useEffect(() => {
    publicationPrompt.current = consumePublicationPrompt(docId)
  }, [])

  const id = unpackDocId(docId)

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

  // const [rangeState, rangeSend, rangeActor] = useRangeSelection()
  const rangeRef = useRef<HTMLDivElement>(null)

  if (publication.data) {
    let accessory: ReactNode | null = null

    if (accessoryKey == 'versions') {
      accessory = (
        <EntityVersionsAccessory
          id={unpackDocId(docId)}
          variantVersion={publication.data?.variantVersion}
          activeVersion={publication.data?.publication?.version}
        />
      )
    } else if (accessoryKey == 'citations') {
      accessory = <EntityCitationsAccessory entityId={docId} />
    } else if (
      accessoryKey == 'comments' &&
      id &&
      publication.data?.publication?.version
    ) {
      accessory = (
        <EntityCommentsAccessory
          id={id}
          activeVersion={publication.data?.publication?.version}
        />
      )
    }
    return (
      <ErrorBoundary
        FallbackComponent={AppErrorPage}
        onReset={() => publication.refetch()}
      >
        {pubPromptDialog.content}
        {firstPubDialog.content}
        {pushToGatewayDialog.content}
        <CitationsProvider
          documentId={docId}
          onCitationsOpen={() => {
            // todo, pass active citations into route
            replace({...route, accessory: {key: 'citations'}})
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
                <AppPublicationContentProvider
                  citations={mentions.data?.mentions}
                  onCitationClick={() => {
                    if (route.accessory?.key === 'citations')
                      return replace({...route, accessory: null})
                    replace({...route, accessory: {key: 'citations'}})
                  }}
                  onBlockComment={(blockId, blockRange) => {
                    replace({...route, accessory: {key: 'comments'}})
                    const version = publication.data?.publication?.version
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
                  <PublicationHeading
                    right={
                      <XStack
                        gap="$2"
                        // opacity={0}
                        // $group-header-hover={{opacity: 1}}
                      >
                        {id && (
                          <FavoriteButton
                            url={createHmId('d', id.eid, {
                              variants: route.variants,
                            })}
                          />
                        )}
                        <CopyReferenceButton />
                        <Tooltip content="Add to Location">
                          <Button
                            icon={Add}
                            size="$2"
                            onPress={() => {
                              pubPromptDialog.open({
                                title:
                                  publication.data.publication?.document
                                    ?.title || '',
                                version: route.versionId,
                                docId: route.documentId,
                                afterPublish: false,
                              })
                            }}
                          />
                        </Tooltip>
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
                        ref={rangeRef}
                        publication={publication.data?.publication}
                        focusBlockId={route.focusBlockId}
                      />
                    </>
                  ) : null}
                </AppPublicationContentProvider>
              </YStack>
              {/* {route.versionId && (
                    <OutOfDateBanner docId={docId} version={route.versionId} />
                  )} */}
            </MainWrapper>
          </AccessoryLayout>
          <Footer>
            {publication.data?.variantVersion && (
              <PublicationVersionsFooterButton
                variantVersion={publication.data?.variantVersion}
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
                    return replace({...route, accessory: null})
                  replace({...route, accessory: {key: 'citations'}})
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

function PublicationPageMeta({publication}: {publication: Publication}) {
  const editors = useAccounts(publication.document?.editors || [])
  const navigate = useNavigate()
  const docGroups = useCurrentDocumentGroups(publication.document?.id)

  console.log(`== ~ PublicationPageMeta ~ docGroups:`, docGroups)
  const allSelectedGroups = docGroups.data?.filter((groupItem) => {
    const groupItemId = unpackDocId(groupItem.rawUrl)
    return !!groupItemId?.version && groupItemId.version === publication.version
  })
  const selectedGroups = allSelectedGroups?.filter(
    (item, index) =>
      index ===
      allSelectedGroups.findIndex(
        (findItem) => findItem.groupId === item.groupId,
      ),
  )
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
          <Text marginHorizontal="$4" color="$color10">
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

function PublicationPrompt({
  input,
  onClose,
}: {
  input: {
    afterPublish: boolean
    docId: string
    version: string
    title: string
  }
  onClose: () => void
}) {
  const account = useMyAccount()
  const accountId = account.data?.id
  const myGroups = useAccountGroups(accountId)
  const navReplace = useNavigate('replace')
  const [executing, setExecuting] = useState(false)
  const groupsOptions = useMemo<Array<HMGroup>>(() => {
    if (myGroups.data) {
      return myGroups.data.items
        .map(({group}) => {
          let hmg = hmGroup(group)
          return (hmg as HMGroup) || false
        })
        .filter(Boolean)
    } else {
      return []
    }
  }, [myGroups.data])
  const grpcClient = useGRPCClient()

  const [pathname, setPathName] = useState(() => {
    if (input.title) {
      return setGroupPath(input.title)
    } else {
      return ''
    }
  })

  function setGroupPath(input: string) {
    let newVal = pathNameify(input || '')
    if (input.at(-1) === ' ' && newVal.at(-1) !== '-')
      return `${pathNameify(input)}-`
    return newVal
  }

  const [addTo, setAddTo] = useState<'account' | 'location'>('account')
  const accountHomeId = useMemo(() => {
    if (addTo != 'account') return undefined
    return account.data?.profile?.rootDocument
  }, [addTo])

  const [groupTarget, setGroupTarget] = useState<HMGroup | null>(null)
  const [groupHomeId, setGroupHomeId] = useState<string | null>(null)

  useEffect(() => {
    setTargetSection(null)

    setTargetSectionList([])
    if (addTo != 'location') return
    if (!groupTarget) return

    getGroupDoc(groupTarget).then((doc) => {
      setGroupHomeId(doc)
    })

    async function getGroupDoc(group: HMGroup) {
      const groupContent = await grpcClient.groups.listContent({
        id: group.id,
        version: group.version,
      })

      return groupContent?.content?.['/'] || null
    }
  }, [addTo, groupTarget])

  const targetHome = useMemo(() => {
    if (addTo == 'account' && accountHomeId) return unpackDocId(accountHomeId)
    if (addTo == 'location' && groupTarget && typeof groupHomeId == 'string')
      return unpackDocId(groupHomeId)

    return undefined
  }, [addTo, accountHomeId, groupHomeId, groupTarget])

  const [targetSectionList, setTargetSectionList] = useState<Array<any>>([])
  const [targetSection, setTargetSection] = useState<{
    id: string
    text: string
  } | null>(null)

  const [pushToGroup, setPushToGroup] = useState<boolean>(false)

  useEffect(() => {
    if (!targetHome) return
    console.log(`== ~ getPubSections ~ unpackRef:`, targetHome)
    getPubSections(targetHome).then((sections) => {
      setTargetSectionList(sections)
    })
    async function getPubSections(unpackRef: UnpackedDocId) {
      let sections: Array<{id: string; text: string}> = []
      const pub = await grpcClient.publications.getPublication({
        documentId: unpackRef.docId,
        version: unpackRef?.version || undefined,
      })

      if (pub?.document?.children.length) {
        pub?.document?.children.forEach((bn) => {
          if (bn.block?.type == 'heading') {
            sections.push({
              text: bn.block.text,
              id: bn.block.id,
            })
          }
        })
      }
      return sections
    }
  }, [targetHome])

  async function performAdd() {
    setExecuting(true)
    let embed = {
      id: nanoid(8),
      type: 'embed',
      ref: `${input.docId}?v=${input.version}`,
      attributes: {
        view: 'content',
        childrenType: 'group',
      },
    }
    let draft: Document | null = null
    try {
      draft = await grpcClient.drafts.getDraft({
        documentId: targetHome?.docId,
      })
    } catch (error) {
      draft = await grpcClient.drafts.createDraft({
        existingDocumentId: targetHome?.docId,
      })
    }

    if (draft) {
      const parentBlockNode =
        targetSection && draft.children.length
          ? draft.children.find((bn) => bn.block?.id == targetSection?.id)
          : draft.children
          ? draft.children[draft.children.length - 1]
          : null
      if (parentBlockNode) {
        const leftSibling = parentBlockNode.children.length
          ? parentBlockNode.children[parentBlockNode.children.length - 1].block
              ?.id
          : ''

        let draftChanges = [
          new DocumentChange({
            op: {
              case: 'moveBlock',
              value: {
                parent: targetSection!.id,
                blockId: embed.id,
                leftSibling,
              },
            },
          }),
          new DocumentChange({
            op: {
              case: 'replaceBlock',
              value: embed,
            },
          }),
        ]

        let updatedDraft = await grpcClient.drafts.updateDraft({
          documentId: draft.id,
          changes: draftChanges,
        })

        if (
          updatedDraft &&
          updatedDraft.updatedDocument &&
          updatedDraft.updatedDocument.id
        ) {
          // setTimeout(() => {
          //   console.log('--- NAV TO ROUTE', {
          //     key: 'draft',
          //     draftId: updatedDraft.updatedDocument.id,
          //     variant: null,
          //   })
          navReplace({
            key: 'draft',
            draftId: updatedDraft.updatedDocument.id,
            variant: null,
          })
          // }, 300)
        }
      } else {
        setExecuting(false)
        console.error(
          'add to location error: no parentBlockNode',
          draft,
          targetSection,
        )
        throw new Error('add to location error: no parentBlockNode')
      }
    }
    // setTimeout(() => {
    //   if (draft) {
    //     grpcClient.drafts.deleteDraft({
    //       documentId: draft.id,
    //     })
    //   }
    //   setExecuting(false)
    // }, 1000)
  }

  return (
    <>
      {input.afterPublish ? (
        <>
          <DialogTitle>{input.title} was published successfully!</DialogTitle>
          <DialogDescription textAlign="center">
            You can now see it on your document's list
          </DialogDescription>
          <Button size="$2">Copy document's gateway URL</Button>
          <DialogDescription>
            You just publish a document to your account, now let's do something
            fun with it
          </DialogDescription>
        </>
      ) : (
        <>
          <DialogTitle>Add {input.title} to Location</DialogTitle>
          <Button size="$2">Copy document's gateway URL</Button>
        </>
      )}

      <RadioGroup
        gap="$2"
        defaultValue="account"
        name="add-to-location"
        theme="mint"
        onValueChange={setAddTo}
      >
        <YStack borderColor="$color7" borderWidth={2} borderRadius="$3" p="$3">
          <XStack ai="center" gap="$2">
            <RadioGroup.Item value="account" id="account">
              <RadioGroup.Indicator />
            </RadioGroup.Item>
            <Label f={1} htmlFor="account" fontWeight="600">
              Add to my Account Page
            </Label>
          </XStack>
          {addTo == 'account' ? (
            <XStack ai="center" gap="$3">
              <SectionSelector
                id="add-to-account"
                disabled={addTo != 'account'}
                defaultValue={
                  targetSectionList.length
                    ? targetSectionList?.[0].id
                    : undefined
                }
                sections={targetSectionList}
                value={targetSection ? targetSection?.id : ''}
                onValueChange={(sectionId) => {
                  let newS =
                    targetSectionList.find((s) => s.id == sectionId) || null

                  setTargetSection(newS)
                }}
              />
            </XStack>
          ) : null}
        </YStack>
        <YStack borderColor="$color7" borderWidth={2} borderRadius="$3" p="$3">
          <XStack ai="center" gap="$2">
            <RadioGroup.Item value="location" id="location">
              <RadioGroup.Indicator />
            </RadioGroup.Item>
            <Label f={1} htmlFor="location" fontWeight="600">
              Add to Group
            </Label>
          </XStack>
          {addTo == 'location' ? (
            <YStack gap="$2">
              <XStack ai="center" gap="$3">
                <XStack f={1}>
                  <GroupSelector
                    disabled={addTo != 'location'}
                    value={groupTarget?.id || ''}
                    groups={groupsOptions}
                    onValueChange={(val) => {
                      console.log('--- change', val)
                      const newG = groupsOptions.find((g) => g.id === val)

                      if (newG) {
                        setGroupTarget(newG)
                      } else {
                        throw Error('no group found??')
                      }
                    }}
                  />
                </XStack>
                {targetSectionList.length ? (
                  <>
                    <SizableText>/</SizableText>
                    <XStack f={1}>
                      <SectionSelector
                        id="add-to-location"
                        disabled={addTo != 'location'}
                        defaultValue={
                          targetSectionList.length
                            ? targetSectionList?.[0].id
                            : undefined
                        }
                        sections={targetSectionList}
                        value={targetSection ? targetSection?.id : ''}
                        onValueChange={(sectionId) => {
                          let newS =
                            targetSectionList.find((s) => s.id == sectionId) ||
                            null

                          setTargetSection(newS)
                        }}
                      />
                    </XStack>
                  </>
                ) : null}
              </XStack>

              <XStack gap="$4">
                <XStack gap="$2" ai="center">
                  <Checkbox
                    id={'push-to-group'}
                    size="$4"
                    checked={pushToGroup}
                    onCheckedChange={setPushToGroup}
                  >
                    <Checkbox.Indicator>
                      <CheckIcon />
                    </Checkbox.Indicator>
                  </Checkbox>
                  <Label htmlFor="push-to-group">Pathname</Label>
                </XStack>
                <Input
                  disabled={!pushToGroup}
                  opacity={pushToGroup ? 1 : 0.5}
                  f={1}
                  id="pathname"
                  value={pathname}
                  onChangeText={(val) => {
                    let newVal = setGroupPath(val)
                    setPathName(newVal)
                  }}
                  placeholder="document pathname"
                />
              </XStack>
            </YStack>
          ) : null}
        </YStack>
      </RadioGroup>
      <XStack jc="flex-end" ai="center" gap="$2">
        <Button size="$3" theme="red" chromeless outlined onPress={onClose}>
          Cancel
        </Button>
        <Button
          disabled={executing}
          opacity={executing ? 0.5 : 1}
          onPress={performAdd}
          size="$3"
        >
          Move to Location
        </Button>
        {executing ? <Spinner size="small" /> : null}
      </XStack>
    </>
  )
}

function GroupSelector({
  value,
  onValueChange,
  groups,
  disabled = false,
  ...props
}: {
  groups?: Array<HMGroup>
  value: string

  onValueChange: (val: string) => void
  disabled?: boolean
}) {
  if (!groups || !groups.length) return null
  return (
    <Select
      id="my-groups"
      value={value}
      onValueChange={onValueChange}
      name="my-groups-selector"
      disabled={disabled}
      {...props}
    >
      <Select.Trigger width="100%">
        <Select.Value placeholder="Select a group" />
      </Select.Trigger>
      <Select.Content zIndex={200000}>
        <Select.ScrollUpButton
          alignItems="center"
          justifyContent="center"
          position="relative"
          height="$3"
        >
          <YStack zIndex={10}>
            <ChevronUp size={20} />
          </YStack>
        </Select.ScrollUpButton>
        <Select.Viewport
          animation="fast"
          animateOnly={['transform', 'opacity']}
          enterStyle={{opacity: 0, y: -10}}
          exitStyle={{opacity: 0, y: 10}}
        >
          {groups.map((option, index) => (
            <Select.Item index={option.id} value={option.id} key={option.id}>
              <Select.ItemText>{option.title}</Select.ItemText>
            </Select.Item>
          ))}
        </Select.Viewport>

        <Select.ScrollDownButton
          alignItems="center"
          justifyContent="center"
          position="relative"
          height="$3"
        >
          <YStack zIndex={10}>
            <ChevronDown size={20} />
          </YStack>
        </Select.ScrollDownButton>
      </Select.Content>
    </Select>
  )
}

function SectionSelector({
  sections,
  id,
  value,
  onValueChange,
  disabled,
  defaultValue,
  ...props
}: {
  id: string
  sections: Array<any>
  value: string
  ['defaultValue']
  onValueChange: (value: string) => void
  disabled?: boolean
}) {
  if (!sections) return null
  return (
    <Select
      id={id}
      value={value}
      onValueChange={onValueChange}
      name={id}
      disabled={disabled}
      defaultValue={defaultValue}
      {...props}
    >
      <Select.Trigger width="100%">
        <Select.Value placeholder="Select Section" />
      </Select.Trigger>
      <Select.Content zIndex={200000}>
        <Select.ScrollUpButton
          alignItems="center"
          justifyContent="center"
          position="relative"
          height="$3"
        >
          <YStack zIndex={10}>
            <ChevronUp size={20} />
          </YStack>
        </Select.ScrollUpButton>
        <Select.Viewport
          animation="fast"
          animateOnly={['transform', 'opacity']}
          enterStyle={{opacity: 0, y: -10}}
          exitStyle={{opacity: 0, y: 10}}
        >
          {sections.map((option, index) => (
            <Select.Item index={option.id} value={option.id} key={option.id}>
              <Select.ItemText>{option.text}</Select.ItemText>
            </Select.Item>
          ))}
        </Select.Viewport>

        <Select.ScrollDownButton
          alignItems="center"
          justifyContent="center"
          position="relative"
          height="$3"
        >
          <YStack zIndex={10}>
            <ChevronDown size={20} />
          </YStack>
        </Select.ScrollDownButton>
      </Select.Content>
    </Select>
  )
}
