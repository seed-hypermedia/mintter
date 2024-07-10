import {zodResolver} from '@hookform/resolvers/zod'
import {useMyAccount} from '@mintter/app/models/accounts'
import {getDefaultShortname} from '@mintter/app/models/documents'
import {
  useAccountGroups,
  useGroup,
  useMyGroups,
  usePublishDocToGroup,
} from '@mintter/app/models/groups'
import {usePublicationVariant} from '@mintter/app/models/publication'
import {usePopoverState} from '@mintter/app/use-popover-state'
import {
  NavContextProvider,
  useNavRoute,
  useNavigation,
} from '@mintter/app/utils/navigation'
import {pathNameify} from '@mintter/app/utils/path'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {
  API_FILE_URL,
  AuthorVariant,
  GroupVariant,
  HYPERMEDIA_ENTITY_TYPES,
  Publication,
  PublicationVariant,
  UnpackedHypermediaId,
  createPublicWebHmUrl,
  formattedDateMedium,
  shortenPath,
  unpackDocId,
  unpackHmId,
} from '@mintter/shared'
import {AuthorVersion} from '@mintter/shared/src/client/.generated/entities/v1alpha/entities_pb'
import {
  Button,
  ButtonText,
  Check,
  ChevronDown,
  ChevronUp,
  Dialog,
  DialogDescription,
  DialogProps,
  DialogTitle,
  Form,
  Input,
  Popover,
  PopoverTrigger,
  SizableText,
  Spinner,
  Tooltip,
  UIAvatar,
  View,
  XStack,
  YStack,
  toast,
} from '@mintter/ui'
import {ArrowRight, Book, Pencil, Upload} from '@tamagui/lucide-icons'
import {ComponentProps, PropsWithChildren, useMemo, useState} from 'react'
import {SubmitHandler, useForm} from 'react-hook-form'
import {z} from 'zod'
import {useAccount} from '../models/accounts'
import {useEntityTimeline} from '../models/changes'
import {useGatewayUrl} from '../models/gateway-settings'
import {useCurrentDocumentGroups} from '../models/groups'
import {getAccountName} from '../pages/account-page'
import {RenamePubDialog} from '../src/rename-publication-dialog'
import {NavRoute, PublicationRoute} from '../utils/routes'
import CommitDraftButton from './commit-draft-button'
import {useAppDialog} from './dialog'
import DiscardDraftButton from './discard-draft-button'
import {EditDocButton, useEditDraft} from './edit-doc-button'
import {ExportDocButton} from './export-doc-button'
import {FormInput} from './form-input'
import {FormErrors, FormField} from './forms'
import {SelectInput} from './select-input'

export function RenameShortnameDialog({
  input: {groupId, pathName, docTitle, draftId},
  onClose,
}: {
  input: {groupId: string; pathName: string; docTitle?: string; draftId: string}
  onClose: () => void
}) {
  const [renamed, setRenamed] = useState(
    pathName || getDefaultShortname(docTitle, draftId),
  )
  const replace = useNavigate('replace')
  const route = useNavRoute()
  const draftRoute = route.key === 'draft' ? route : null
  const group = useGroup(groupId)
  if (!draftRoute) return null
  const groupRouteContext =
    draftRoute.variant?.key === 'group' ? draftRoute.variant : null
  if (!groupRouteContext?.groupId) return null
  return (
    <Form
      onSubmit={() => {
        onClose()
        toast(pathNameify(renamed))
        replace({
          ...draftRoute,
          variant: {
            key: 'group',
            groupId: groupRouteContext.groupId,
            pathName: renamed,
          },
        })
      }}
    >
      <DialogTitle>Publishing Short Path</DialogTitle>
      <DialogDescription>
        Draft will publish in the group <b>{group.data?.title}</b> with the
        following path name:
      </DialogDescription>
      <Input
        value={renamed}
        onChangeText={(value) => {
          setRenamed(
            value
              .toLocaleLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9-_]/g, '')
              .replace(/-{2,}/g, '-'),
          )
        }}
      />
      <Form.Trigger asChild>
        <Button>Save</Button>
      </Form.Trigger>
    </Form>
  )
}

const publishToGroupFormSchema = z.object({
  groupId: z.string(),
  pathName: z
    .string()
    .min(2, {message: 'Path name must be 2 characters or longer'})
    .refine(
      (pathName) => {
        return pathName[0] !== '.'
      },
      {message: 'Path name cannot start with a dot'},
    ),
})

type PublishToGroupFields = z.infer<typeof publishToGroupFormSchema>

export function GroupPublishDialog({
  input,
  onClose,
}: {
  input: {
    docId: string
    version?: string | undefined
    docTitle?: string | undefined
    onComplete?: () => void
    editDraftId?: string | undefined
  }
  onClose: () => void
}) {
  const account = useMyAccount()
  const accountId = account.data?.id
  const myGroups = useAccountGroups(accountId)
  const defaultPathName = getDefaultShortname(input.docTitle || '', input.docId)
  const route = useNavRoute()
  const navigate = useNavigate('replace')
  const draftRoute = route.key === 'draft' ? route : null
  const pubRoute = route.key === 'publication' ? route : null
  const publishToGroup = usePublishDocToGroup()

  const {
    control,
    handleSubmit,
    setFocus,
    formState: {errors},
  } = useForm<PublishToGroupFields>({
    resolver: zodResolver(publishToGroupFormSchema),
    defaultValues: {
      groupId: undefined,
      pathName: defaultPathName,
    },
  })
  //  useEffect(() => {
  //     if (myGroups?.data?.items?.length && !selectedGroupId)
  //       setSelectedGroupId(myGroups.data?.items?.[0]?.group?.id)
  //   }, [myGroups.data, selectedGroupId])
  const onSubmit: SubmitHandler<PublishToGroupFields> = (data) => {
    const {groupId, pathName} = data
    if (!groupId) {
      toast.error('Please select a group')
      return
    }
    if (pubRoute && input.version) {
      // we are in a publication and we are expected to immediately put this in the group
      toast
        .promise(
          publishToGroup
            .mutateAsync({
              groupId,
              docId: input.docId,
              version: input.version,
              pathName,
            })
            .then((didChange: boolean) => {
              navigate({
                ...pubRoute,
                variants: [
                  {
                    key: 'group',
                    groupId,
                    pathName,
                  },
                ],
              })
              return didChange
            }),
          {
            loading: 'Publishing...',
            success: (result) => {
              if (result) return 'Published to Group'
              else return 'Already Published Here'
            },
            error: 'Failed to Publish!',
          },
        )
        .finally(() => {
          onClose()
          input.onComplete?.()
        })
    } else if (draftRoute) {
      // we are in a draft and we are only setting the group ID and pathName in the route
      navigate({
        ...draftRoute,
        variant: {
          key: 'group',
          groupId,
          pathName,
        },
      })
      onClose()
      input.onComplete?.()
    }
  }
  if (!myGroups.data) return <Spinner />
  const groupOptions: {label: string; value: string}[] = myGroups.data.items
    .map((item) => ({
      label: item.group?.title || '',
      value: item.group?.id || '',
    }))
    .filter((item) => !!item.value)

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <DialogTitle>Publish to Group</DialogTitle>

      <FormErrors errors={errors} />

      <FormField name="groupId" label="Group" errors={errors}>
        <SelectInput
          control={control}
          name="groupId"
          placeholder="Select Group.."
          noOptionsMessage="You are not the editor or owner of any groups. Create a group to publish to."
          options={groupOptions}
        />
      </FormField>

      <FormField name="pathName" label="Path / Shortname" errors={errors}>
        <FormInput
          placeholder={'Path / Shortname'}
          control={control}
          transformInput={(input) => {
            const namified = pathNameify(input)
            if (input.at(-1) === ' ' && namified.at(-1) !== '-')
              return `${pathNameify(input)}-`
            return namified
          }}
          name="pathName"
        />
      </FormField>

      <Form.Trigger asChild>
        <Button>Submit</Button>
      </Form.Trigger>
    </Form>
  )
}

export function ContextPopover({...props}) {
  return (
    <Popover
      size="$5"
      allowFlip={true}
      placement="bottom-end"
      keepChildrenMounted={true}
      {...props}
    />
  )
}

export function ContextPopoverTitle({
  children,
  ...props
}: PropsWithChildren<ComponentProps<typeof SizableText>>) {
  return (
    <SizableText
      marginTop="$2"
      size="$3"
      padding="$2"
      paddingHorizontal="$4"
      fontWeight="bold"
      userSelect="none"
      {...props}
    >
      {children}
    </SizableText>
  )
}

export function ContextPopoverContent(props) {
  return (
    <Popover.Content
      padding={0}
      width={350}
      name={'ContextPopoverContent'}
      borderWidth={2}
      borderColor={'$borderColor'}
      backgroundColor={'$background'}
      elevation={'$2'}
      enterStyle={{y: -10, opacity: 0}}
      exitStyle={{y: -10, opacity: 0}}
      elevate
      animation={[
        'fast',
        {
          opacity: {
            overshootClamping: true,
          },
        },
      ]}
      {...props}
    />
  )
}

export function ContextPopoverArrow(props) {
  return (
    <Popover.Arrow
      name="ContextPopoverArrow"
      borderWidth={1}
      backgroundColor="$background"
      {...props}
    />
  )
}

export function GroupVariantItem({
  groupId,
  path,
  onPress,
  onPathPress,
  isActive,
  isVersionMatched,
}: {
  groupId: string
  path: string | null
  onPress?: () => void
  onPathPress?: (() => void) | undefined
  isActive?: boolean
  isVersionMatched?: boolean
}) {
  const group = useGroup(groupId)
  const myGroups = useMyGroups()
  const isGroupMember = myGroups.data?.items?.find((groupAccount) => {
    return groupAccount.group?.id === groupId
  })
  const isPathPressable = isActive && isGroupMember && onPathPress
  return (
    <Button
      size="$3"
      justifyContent="flex-start"
      icon={Book}
      backgroundColor="transparent"
      flex={1}
      minHeight={50}
      color={isVersionMatched ? '$blue11' : '$color12'}
      disabled={isActive}
      onPress={onPress}
      userSelect="none"
    >
      <XStack gap="$4" jc="space-between" flex={1} ai="center" mr={-8}>
        <YStack alignItems="flex-start">
          <SizableText
            fontSize={path === '/' ? '$3' : '$2'}
            color={isVersionMatched ? '$blue11' : '$color12'}
          >
            {group.data?.title}
          </SizableText>
          {path === '/' || path == null ? null : (
            <ButtonText
              fontSize="$1"
              color="$color11"
              disabled={!isPathPressable}
              onPress={
                isPathPressable
                  ? (e) => {
                      e.stopPropagation()
                      onPathPress()
                    }
                  : undefined
              }
              hoverStyle={
                isPathPressable
                  ? {
                      textDecorationLine: 'underline',
                    }
                  : {}
              }
            >
              {shortenPath(path)}
            </ButtonText>
          )}
        </YStack>
        <View style={{minWidth: 22}}>
          {isActive && <Check size="$1" color="$blue11" />}
        </View>
      </XStack>
    </Button>
  )
}

export function VersionContext({route}: {route: NavRoute}) {
  let exactVersion: string | null = null
  let fullUrl: string | null = null
  const navigate = useNavigate()
  let unpackedId: UnpackedHypermediaId | null = null
  let latestVersionRoute: NavRoute | null = null
  const gwUrl = useGatewayUrl()
  const pubRoute = route.key === 'publication' ? route : null
  const groupRoute = route.key === 'group' ? route : null
  const latestPub = usePublicationVariant({
    documentId: pubRoute?.documentId,
    variants: pubRoute?.variants,
    enabled: !!pubRoute?.documentId,
    // version not specified, so we are fetching the latest
  })
  const group = useGroup(groupRoute?.groupId, undefined, {
    enabled: !!groupRoute?.groupId,
  })
  if (route.key === 'group') {
    const {groupId, accessory, version, listCategory} = route
    unpackedId = unpackHmId(groupId)
    exactVersion = version || null
    if (version && group.data?.version && group.data.version !== version) {
      latestVersionRoute = {
        key: 'group',
        groupId,
        accessory,
        listCategory,
        version: undefined,
      }
    }
  } else if (route.key === 'publication') {
    const {accessory, documentId, versionId, variants} = route
    unpackedId = unpackHmId(documentId)
    exactVersion = versionId || null
    if (
      versionId &&
      latestPub.data?.publication?.version &&
      latestPub.data?.publication?.version !== versionId
    ) {
      latestVersionRoute = {
        key: 'publication',
        documentId,
        accessory,
        versionId: undefined,
        variants,
      }
    }
  }
  fullUrl =
    unpackedId &&
    exactVersion &&
    createPublicWebHmUrl(unpackedId.type, unpackedId.eid, {
      version: exactVersion,
      hostname: gwUrl.data,
    })
  if (!unpackedId || !exactVersion || !fullUrl) return null
  if (!latestVersionRoute) return null
  return (
    <>
      <XStack gap="$2" ai="center">
        {latestVersionRoute ? (
          <View className="no-window-drag">
            <Tooltip
              content={`You are looking at an older version of this ${HYPERMEDIA_ENTITY_TYPES[
                unpackedId.type
              ].toLowerCase()}. Click to go to the latest ${
                unpackedId.type === 'd' ? 'in this variant' : 'version'
              }.`}
            >
              <Button
                size="$2"
                theme="blue"
                onPress={() => {
                  latestVersionRoute && navigate(latestVersionRoute)
                }}
                iconAfter={ArrowRight}
              >
                Latest Version
              </Button>
            </Tooltip>
          </View>
        ) : null}
      </XStack>
    </>
  )
}

export function PublicationVariants({route}: {route: PublicationRoute}) {
  const publication = usePublicationVariant({
    documentId: route.documentId,
    versionId: route.versionId,
    variants: route.variants,
  })
  const {variants} = route
  const groupVariants = variants?.filter(
    (variant) => variant.key === 'group',
  ) as GroupVariant[] | undefined
  const authorVariants = variants?.filter(
    (variant) => variant.key === 'author',
  ) as AuthorVariant[] | undefined
  if (groupVariants && groupVariants.length > 1)
    throw new Error('Currently only one group variant is supported')
  if (
    authorVariants &&
    groupVariants &&
    authorVariants.length > 0 &&
    groupVariants.length > 0
  )
    throw new Error('Currently only one variant type is supported')
  const pubOwner = publication.data?.publication?.document?.author
  const realAuthorVariants: AuthorVariant[] | undefined =
    groupVariants && groupVariants.length > 0
      ? []
      : (authorVariants && authorVariants.length) || !pubOwner
      ? authorVariants
      : [{key: 'author', author: pubOwner}]
  const groupVariant = groupVariants?.[0]
  const [variantTab, setVariantTab] = useState(
    groupVariant ? 'groups' : 'authors',
  )
  const popoverState = usePopoverState(false, (isOpen) => {
    if (isOpen) setVariantTab(groupVariant ? 'groups' : 'authors')
  })
  const renameDialog = useAppDialog(RenamePubDialog)
  const myAccount = useMyAccount()
  const myGroups = useAccountGroups(myAccount.data?.id)
  const isAuthorVariantEditable =
    !!realAuthorVariants &&
    !!realAuthorVariants.length &&
    !!myAccount.data?.id &&
    !!realAuthorVariants.find(
      (variant) => variant.author === myAccount.data?.id,
    )
  const isGroupVariantEditable =
    !!groupVariant &&
    !!myGroups.data?.items?.find(
      (item) => item.group?.id === groupVariant.groupId,
    )
  const showEditButton = isAuthorVariantEditable || isGroupVariantEditable
  const showExportButton = pubOwner === myAccount.data?.id
  const realVariants = variants || realAuthorVariants
  return (
    <>
      <ContextPopover {...popoverState}>
        <PopoverTrigger asChild>
          <Button
            size="$2"
            className="no-window-drag"
            iconAfter={popoverState.open ? ChevronUp : ChevronDown}
          >
            {realVariants && (
              <VariantState
                variants={realVariants}
                isOpen={popoverState.open}
                publication={publication.data?.publication}
              />
            )}
          </Button>
        </PopoverTrigger>
        <ContextPopoverContent>
          <ContextPopoverArrow />
          <YStack alignSelf="stretch">
            <ContextPopoverTitle marginVertical="$2">
              Select Variant
            </ContextPopoverTitle>
            <TabsView
              value={variantTab}
              onValue={(tab) => {
                setVariantTab(tab)
              }}
              tabs={[
                {
                  label: 'Authors',
                  key: 'authors',
                  element: (
                    <AuthorVariants
                      route={route}
                      publication={publication.data?.publication}
                    />
                  ),
                },
                {
                  label: 'Groups',
                  key: 'groups',
                  element: (
                    <GroupVariants
                      route={route}
                      publication={publication.data?.publication}
                      onCloseVariantPopover={() => {
                        popoverState.onOpenChange(false)
                      }}
                    />
                  ),
                },
              ]}
            />
          </YStack>
        </ContextPopoverContent>
      </ContextPopover>
      {showEditButton && (
        <EditDocButton
          key="editActions"
          contextRoute={route}
          variants={route.variants}
          docId={route.documentId}
          baseVersion={route.versionId}
        />
      )}
      {showExportButton && (
        <ExportDocButton docId={route.documentId} version={route.versionId} />
      )}
      {renameDialog.content}
    </>
  )
}

function VariantState({
  variants,
  isOpen,
  publication,
}: {
  variants: PublicationVariant[]
  isOpen: boolean
  publication: Publication | undefined
}) {
  const groupVariants = variants.filter(
    (variant) => variant.key === 'group',
  ) as GroupVariant[]
  const authorVariants = variants.filter(
    (variant) => variant.key === 'author',
  ) as AuthorVariant[]
  if (groupVariants.length && authorVariants.length)
    throw new Error('Cannot have both group and author variants')
  if (groupVariants.length)
    return <GroupVariantState variants={groupVariants} isOpen={isOpen} />
  return (
    <AuthorVariantState
      variants={authorVariants}
      publication={publication}
      isOpen={isOpen}
    />
  )
  // {contextDestRoute ? (
  //   <ButtonText
  //     hoverStyle={
  //       popoverState.open ? {textDecorationLine: 'underline'} : {}
  //     }
  //     fontSize="$2"
  //     onPress={(e) => {
  //       if (!popoverState.open) return
  //       e.stopPropagation()
  //       navigate(contextDestRoute)
  //     }}
  //   >
  //     {title}
  //   </ButtonText>
  // ) : (
  //   title
  // )}
}

function GroupVariantState({
  variants,
  isOpen,
}: {
  variants: GroupVariant[]
  isOpen: boolean
}) {
  if (variants.length > 1)
    throw new Error('Currently only one group variant is supported')
  const variant = variants[0]
  const group = useGroup(variant.groupId)
  const navigate = useNavigate()
  return (
    <XStack gap="$2" ai="center">
      <Book size={16} />
      <ButtonText
        size="$2"
        disabled={!isOpen}
        hoverStyle={{
          textDecorationLine: isOpen ? 'underline' : 'none',
        }}
        onPress={() => {
          navigate({
            key: 'group',
            groupId: variant.groupId,
          })
        }}
      >
        {group.data?.title}
      </ButtonText>
    </XStack>
  )
}

function AuthorVariantState({
  variants,
  isOpen,
  publication,
}: {
  variants: AuthorVariant[]
  isOpen: boolean
  publication: Publication | undefined
}) {
  const defaultAuthors = publication?.document?.author
    ? [publication?.document?.author]
    : null
  const authors = variants.length
    ? variants.map((variant) => variant.author)
    : defaultAuthors
  const firstAccount = useAccount(authors?.[0])
  if (!authors) return <SizableText>Variant</SizableText>
  return (
    <XStack gap="$2" ai="center">
      {authors.map(
        (author) => author && <AuthorIcon key={author} author={author} />,
      )}
      {authors.length === 1 ? (
        <SizableText size="$2">
          {getAccountName(firstAccount.data?.profile)}
        </SizableText>
      ) : null}
    </XStack>
  )
}

function AuthorIcon({author}: {author: string}) {
  const account = useAccount(author)
  return (
    <UIAvatar
      id={author}
      size={20}
      url={
        account.data?.profile?.avatar &&
        `${API_FILE_URL}/${account.data?.profile?.avatar}`
      }
      label={getAccountName(account.data?.profile) || author}
    />
  )
}

function AuthorVariantItem({
  authorVersion,
  route,
  publication,
  isMerged,
}: {
  authorVersion: AuthorVersion
  route: PublicationRoute
  publication: Publication | undefined
  isMerged?: boolean
}) {
  const authorVariants = route.variants?.filter(
    (variant) => variant.key === 'author',
  ) as AuthorVariant[] | undefined
  const routeAuthors =
    authorVariants && authorVariants.length
      ? authorVariants.map((variant) => variant.author)
      : undefined
  const author = useAccount(authorVersion.author)
  const navigate = useNavigate()
  const activeAuthors =
    routeAuthors ||
    (publication?.document?.author && !route.variants
      ? [publication?.document?.author]
      : [])
  const isVariantActive = new Set(activeAuthors).has(authorVersion.author)
  const isActive =
    !!publication?.version && publication?.version === authorVersion.version
  const isOwner =
    !!publication?.document?.author &&
    publication.document.author === authorVersion.author
  const canPressCheck = activeAuthors.length > 1 || !isVariantActive
  return (
    <Button
      backgroundColor={'transparent'}
      padding="$1"
      group="item"
      paddingHorizontal="$2"
      onPress={() => {
        navigate({
          ...route,
          versionId: undefined,
          variants: [
            {
              key: 'author',
              author: authorVersion.author,
            },
          ],
        })
      }}
      userSelect="none"
    >
      <XStack jc="space-between" f={1} gap="$4" ai="center">
        <XStack gap="$2" f={1} ai="center">
          <UIAvatar
            id={authorVersion.author}
            size={28}
            url={
              author.data?.profile?.avatar &&
              `${API_FILE_URL}/${author.data?.profile?.avatar}`
            }
            label={author.data?.profile?.alias || authorVersion.author}
          />
          <YStack>
            <XStack gap="$2" ai="center">
              <SizableText
                color={isActive ? '$blue11' : isMerged ? '$color10' : '$color'}
              >
                {getAccountName(author.data?.profile)}
              </SizableText>
              {isMerged ? (
                <Tooltip
                  content={`${getAccountName(
                    author.data?.profile,
                  )}'s latest changes have been merged into the current variant`}
                >
                  <XStack>
                    <Check size={16} color={'$color10'} />
                  </XStack>
                </Tooltip>
              ) : null}
              {isActive && !isVariantActive ? (
                <Tooltip
                  content={`${getAccountName(
                    author.data?.profile,
                  )} has the exact same version that you see now`}
                >
                  <XStack>
                    <Check size={16} color={'$blue11'} />
                  </XStack>
                </Tooltip>
              ) : null}
              {isOwner ? (
                <Tooltip
                  content={`${getAccountName(
                    author.data?.profile,
                  )} created this document and controls the default variant`}
                >
                  <XStack
                    borderWidth={1}
                    borderColor="$color8"
                    paddingHorizontal="$1"
                    borderRadius="$2"
                  >
                    <SizableText size="$1" color="$color10">
                      Owner
                    </SizableText>
                  </XStack>
                </Tooltip>
              ) : null}
            </XStack>
            <SizableText color="$color11" size="$1">
              {formattedDateMedium(authorVersion.versionTime)}
            </SizableText>
          </YStack>
        </XStack>
        <XStack
          borderWidth={1}
          hoverStyle={{
            borderColor: canPressCheck ? '$color11' : 'transparent',
          }}
          $group-item-hover={{
            borderColor: canPressCheck ? '$color8' : 'transparent',
          }}
          borderRadius={4}
          borderColor="$colorTransparent"
        >
          <Button
            size="$2"
            chromeless
            paddingHorizontal="$1"
            onPress={(e) => {
              if (!canPressCheck) return
              e.stopPropagation()
              const newAuthors = isVariantActive
                ? activeAuthors.filter((a) => a !== authorVersion.author)
                : [...activeAuthors, authorVersion.author]
              navigate({
                ...route,
                versionId: undefined,
                variants: newAuthors.map((author) => ({
                  key: 'author',
                  author,
                })),
              })
            }}
            borderColor="transparent"
            disabled={!canPressCheck}
            minWidth={30}
          >
            <Check
              color={isVariantActive ? '$blue11' : 'transparent'}
              size="$1"
            />
          </Button>
        </XStack>
      </XStack>
    </Button>
  )
}

function AuthorVariants({
  route,
  publication,
}: {
  route: PublicationRoute
  publication: Publication | undefined
}) {
  if (route.key !== 'publication') throw new Error('Uh')
  const timeline = useEntityTimeline(route.documentId)
  const myAccount = useMyAccount()
  const myVersion = timeline.data?.authorVersions.find(
    (authorVersion) => authorVersion.author === myAccount.data?.id,
  )
  const {handleEdit, hasExistingDraft} = useEditDraft(route.documentId, {
    version: publication?.version,
    contextRoute: route,
    variants: undefined, // this will result in author variant
    navMode: 'push',
  })
  const allChanges = timeline.data?.allChanges
  const thisVersion = publication?.version
  const authorVersions = timeline.data?.authorVersions
  const authorVersionsMergedMap = useMemo(() => {
    const map: Record<string, boolean> = Object.fromEntries(
      authorVersions?.map((authorVersion) => {
        if (authorVersion.version === thisVersion)
          return [authorVersion.version, false]
        const authorChanges = new Set(authorVersion.version.split('.'))
        const matchedChanges = new Set()
        let walkChanges = new Set(thisVersion?.split('.') || [])
        while (walkChanges.size && matchedChanges.size < authorChanges.size) {
          const stepDeps = new Set<string>()
          walkChanges.forEach((changeId) => {
            const change = allChanges?.[changeId]
            if (!change) return
            if (authorChanges.has(changeId)) matchedChanges.add(changeId)
            else change.deps.forEach((changeDep) => stepDeps.add(changeDep))
          })
          walkChanges = stepDeps
        }
        return [
          authorVersion.version,
          matchedChanges.size === authorChanges.size,
        ]
      }) || [],
    )
    return map
  }, [allChanges, thisVersion, authorVersions])
  return (
    <YStack gap="$2" padding="$2">
      {timeline.data?.authorVersions.map((authorVersion) => (
        <AuthorVariantItem
          key={authorVersion.author}
          route={route}
          authorVersion={authorVersion}
          publication={publication}
          isMerged={authorVersionsMergedMap[authorVersion.version]}
        />
      ))}
      {myVersion ? null : (
        <Button
          size="$2"
          onPress={handleEdit}
          theme={hasExistingDraft ? 'yellow' : undefined}
          chromeless
          icon={Pencil}
        >
          {hasExistingDraft ? 'Edit Variant Draft' : 'Create Variant'}
        </Button>
      )}
    </YStack>
  )
}

function GroupVariants({
  route,
  publication,
  onCloseVariantPopover,
}: {
  route: PublicationRoute
  publication: Publication | undefined
  onCloseVariantPopover: () => void
}) {
  if (route.key !== 'publication')
    throw new Error('GroupVariants only for publication route')
  const docGroups = useCurrentDocumentGroups(route.documentId)
  const replaceRoute = useNavigate('replace')
  const publishToGroupDialog = useAppDialog(GroupPublishDialog, {})
  const activeGroupVariants = (route.variants?.filter(
    (variant) => variant.key === 'group',
  ) || []) as GroupVariant[]
  const activeGroupVariantKeys = new Set(
    activeGroupVariants.map(
      (variant) => `${variant.groupId}-${variant.pathName}`,
    ),
  )
  return (
    <YStack gap="$2" padding="$2">
      {docGroups.data?.map((docGroup) => {
        const fullDocId = unpackDocId(docGroup.rawUrl)

        return (
          <GroupVariantItem
            groupId={docGroup.groupId}
            path={docGroup.path}
            isVersionMatched={
              !!publication?.version &&
              publication?.version === fullDocId?.version
            }
            isActive={activeGroupVariantKeys.has(
              `${docGroup.groupId}-${docGroup.path}`,
            )}
            key={`${docGroup.groupId}-${docGroup.path}`}
            onPress={() => {
              replaceRoute({
                ...route,
                variants: [
                  {
                    key: 'group',
                    groupId: docGroup.groupId,
                    pathName: docGroup.path,
                  },
                ],
                versionId: undefined,
              })
            }}
          />
        )
      })}
      <Button
        size="$2"
        onPress={() => {
          onCloseVariantPopover()
          publishToGroupDialog.open({
            docId: route.documentId,
            version: publication?.version,
            docTitle: publication?.document?.title,
            onComplete: () => {
              publishToGroupDialog.close()
            },
          })
        }}
        chromeless
        icon={Upload}
      >
        Publish to Group...
      </Button>
      {publishToGroupDialog.content}
    </YStack>
  )
}

function TabsView({
  tabs,
  value,
  onValue,
}: {
  tabs: {key: string; label: string; element: React.ReactNode}[]
  value: string
  onValue: (tabKey: string) => void
}) {
  const activeTab = tabs.find((tab) => tab.key === value)
  return (
    <YStack>
      <XStack>
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            size="$2"
            f={1}
            bg={tab.key === value ? '$blue4' : 'transparent'}
            onPress={() => {
              onValue(tab.key)
            }}
            borderRadius={0}
            borderWidth={0}
            borderBottomWidth={2}
            borderColor={tab.key === value ? '$blue8' : '$color8'}
            hoverStyle={{
              borderColor: tab.key === value ? '$blue8' : '$color8',
            }}
          >
            {tab.label}
          </Button>
        ))}
      </XStack>
      {activeTab?.element}
    </YStack>
  )
}

export function PageContextButton({}: {}) {
  const route = useNavRoute()
  if (route.key === 'publication') {
    return <PublicationVariants route={route} />
  }
  return null
}

export function PublishDialogInstance({
  closePopover,
  docId,
  version,
  editDraftId,
  groupVariant,
  docTitle,
  ...props
}: DialogProps & {
  closePopover?: () => void
  docId: string
  version: string | undefined
  editDraftId?: string | undefined
  docTitle?: string | undefined
  groupVariant: GroupVariant | null
}) {
  const nav = useNavigation()
  return (
    <Dialog
      modal
      {...props}
      onOpenChange={(open) => {
        props.onOpenChange?.(open)
        if (open) {
          closePopover?.()
        }
      }}
    >
      <Dialog.Trigger asChild>
        <Button size="$2" icon={Upload} className="no-window-drag" chromeless>
          Publish to Group...
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          animation="fast"
          opacity={0.5}
          enterStyle={{opacity: 0}}
          exitStyle={{opacity: 0}}
        />
        <Dialog.Content
          bordered
          elevate
          key="content"
          animateOnly={['transform', 'opacity']}
          animation={[
            'fast',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{x: 0, y: -20, opacity: 0, scale: 0.9}}
          exitStyle={{x: 0, y: 10, opacity: 0, scale: 0.95}}
          gap
        >
          <NavContextProvider value={nav}>
            <GroupPublishDialog
              input={{docId, version, editDraftId, docTitle}}
              onClose={() => closePopover?.()}
            />
          </NavContextProvider>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}

export function DraftPublicationButtons() {
  return (
    <>
      <CommitDraftButton />
      <DiscardDraftButton />
    </>
  )
}
