import {ContactsPrompt} from '@mintter/app/components/contacts-prompt'
import {useMyAccount} from '@mintter/app/models/accounts'
import {usePublicationVariant} from '@mintter/app/models/publication'
import {
  useNavRoute,
  useNavigationDispatch,
  useNavigationState,
} from '@mintter/app/utils/navigation'
import {
  BlockRange,
  ExpandedBlockRange,
  GroupVariant,
  createHmId,
  createPublicWebHmUrl,
  hmId,
  serializeBlockRange,
  unpackHmId,
} from '@mintter/shared'
import {
  Back,
  Button,
  ColorProp,
  Forward,
  Menu,
  TitlebarSection,
  Tooltip,
  View,
  XGroup,
  XStack,
  copyUrlToClipboardWithFeedback,
  toast,
  useStream,
} from '@mintter/ui'
import {
  ArrowLeftFromLine,
  ArrowRightFromLine,
  ArrowUpRight,
  Book,
  Copy,
  ExternalLink,
  FileText,
  Link,
  Pencil,
  Plus,
  Send,
  Trash,
  UploadCloud,
  X,
} from '@tamagui/lucide-icons'
import copyTextToClipboard from 'copy-text-to-clipboard'
import {ReactNode, useState} from 'react'
import {useAppContext} from '../app-context'
import {useAccount} from '../models/accounts'
import {useEntityTimeline} from '../models/changes'
import {usePushPublication} from '../models/documents'
import {useGatewayHost, useGatewayUrl} from '../models/gateway-settings'
import {
  useCanEditGroup,
  useGroup,
  useGroupContent,
  useInvertedGroupContent,
} from '../models/groups'
import {RemoveProfileDocDialog} from '../pages/account-page'
import {AddToCategoryDialog} from '../src/add-to-category-dialog'
import {SidebarWidth, useSidebarContext} from '../src/sidebar-context'
import {useOpenDraft} from '../utils/open-draft'
import {GroupRoute, NavRoute} from '../utils/routes'
import {useNavigate} from '../utils/useNavigate'
import {CloneGroupDialog} from './clone-group'
import {DraftPublicationButtons} from './commit-draft-button'
import {useCopyGatewayReference} from './copy-gateway-reference'
import {useDeleteDialog} from './delete-dialog'
import {useAppDialog} from './dialog'
import {EditDocButton} from './edit-doc-button'
import {useEditGroupInfoDialog} from './edit-group-info'
import {useEditProfileDialog} from './edit-profile-dialog'
import {useFavoriteMenuItem} from './favoriting'
import {useCreateGroupDialog} from './new-group'
import {MenuItemType, OptionsDropdown} from './options-dropdown'
import {usePublishGroupDialog} from './publish-group'
import {TitleBarProps} from './titlebar'
import {PublicationVariants, VersionContext} from './variants'

export function DocOptionsButton() {
  const route = useNavRoute()
  const dispatch = useNavigationDispatch()
  if (route.key !== 'publication')
    throw new Error(
      'DocOptionsButton can only be rendered on publication route',
    )
  const docId = route.documentId
  const groupVariants = route.variants?.filter((v) => v.key === 'group') as
    | GroupVariant[]
    | undefined
  const groupVariant =
    groupVariants?.length === 1 ? groupVariants[0] : undefined
  const gwHost = useGatewayHost()
  const addToCategoryDialog = useAppDialog(AddToCategoryDialog)
  const push = usePushPublication()
  const deleteEntity = useDeleteDialog()
  const [copyContent, onCopy, host] = useCopyGatewayReference()
  const pub = usePublicationVariant({
    documentId: route.documentId,
    versionId: route.versionId,
    variants: route.variants,
  })
  const menuItems: MenuItemType[] = [
    {
      key: 'link',
      label: `Copy ${host} URL`,
      icon: Link,
      onPress: () => {
        const id = unpackHmId(route.documentId)
        if (!id) {
          toast.error('Failed to identify document URL')
          return
        }
        onCopy({
          ...id,
          variants: route.variants,
        })
      },
    },
    {
      key: 'push',
      label: 'Push to Gateway',
      icon: UploadCloud,
      onPress: () => {
        toast.promise(push.mutateAsync(route.documentId), {
          loading: 'Pushing...',
          success: `Pushed to ${gwHost}`,
          error: (err) => `Could not push to ${gwHost}: ${err.message}`,
        })
      },
    },
    {
      key: 'delete',
      label: 'Delete Publication',
      icon: Trash,
      onPress: () => {
        deleteEntity.open({
          id: route.documentId,
          title: pub.data?.publication?.document?.title,
          onSuccess: () => {
            // dispatch({type: 'backplace', route: {key: 'feed', tab: 'trusted'}})
            dispatch({type: 'pop'})
          },
        })
      },
    },
    // ...(groupVariant && groupVariant.pathName
    //   ? [
    //       {
    //         key: 'add-to-category',
    //         label: 'Add to Category',
    //         icon: PackageOpen,
    //         onPress: () => {
    //           const {groupId, pathName} = groupVariant
    //           addToCategoryDialog.open({groupId, docId, pathName})
    //         },
    //       },
    //     ]
    //   : []),
  ]
  const id = unpackHmId(docId)
  const docUrl = id
    ? createHmId('d', id.eid, {
        version: route.versionId,
        variants: route.variants,
      })
    : null
  menuItems.push(useFavoriteMenuItem(docUrl))

  return (
    <>
      {copyContent}
      {addToCategoryDialog.content}
      {deleteEntity.content}
      <OptionsDropdown menuItems={menuItems} />
    </>
  )
}

export function AccountOptionsButton() {
  const route = useNavRoute()
  if (route.key !== 'account')
    throw new Error(
      'AccountOptionsButton can only be rendered on account route',
    )
  const menuItems: MenuItemType[] = []
  const accountUrl = createHmId('a', route.accountId)
  menuItems.push(useFavoriteMenuItem(accountUrl))
  const account = useAccount(route.accountId)
  const dispatch = useNavigationDispatch()
  const deleteEntity = useDeleteDialog()
  const myAccount = useMyAccount()
  const spawn = useNavigate('spawn')
  const editProfileDialog = useEditProfileDialog()
  const removeProfileDoc = useAppDialog(RemoveProfileDocDialog, {isAlert: true})
  const isMyAccount = myAccount.data?.id === route.accountId
  if (isMyAccount) {
    menuItems.push({
      key: 'edit-account',
      label: 'Edit Account Info',
      icon: Pencil,
      onPress: () => {
        editProfileDialog.open(true)
      },
    })
  }
  const accountId = account.data?.id
  const rootDocument = account.data?.profile?.rootDocument
  if (isMyAccount && rootDocument) {
    menuItems.push({
      key: 'rm-profile',
      label: 'Remove Profile Document',
      icon: X,
      onPress: () => {
        removeProfileDoc.open({})
      },
    })
  }
  if (accountId && rootDocument) {
    menuItems.push({
      key: 'profile-new-window',
      label: 'Open Profile in New Window',
      icon: ArrowUpRight,
      onPress: () => {
        spawn({
          key: 'publication',
          documentId: rootDocument,
          variants: [
            {
              key: 'author',
              author: accountId,
            },
          ],
        })
      },
    })
  }
  menuItems.push({
    key: 'delete',
    label: 'Delete Account',
    icon: Trash,

    onPress: () => {
      deleteEntity.open({
        id: createHmId('a', route.accountId),
        title: account.data?.profile?.alias,
        onSuccess: () => {
          dispatch({type: 'pop'})
        },
      })
    },
  })
  return (
    <>
      <OptionsDropdown menuItems={menuItems} />
      {deleteEntity.content}
      {editProfileDialog.content}
      {removeProfileDoc.content}
    </>
  )
}

function EditAccountButton() {
  const route = useNavRoute()
  if (route.key !== 'account')
    throw new Error(
      'AccountOptionsButton can only be rendered on account route',
    )
  const myAccount = useMyAccount()
  if (myAccount.data?.id !== route.accountId) {
    return null
  }
  if (route.tab !== 'profile' && route.tab) return null
  return (
    <EditDocButton
      docId={myAccount.data?.profile?.rootDocument || undefined}
      isProfileDocument
      baseVersion={undefined}
      navMode="push"
      contextRoute={route}
    />
  )
}

function EditGroupButton({route}: {route: GroupRoute}) {
  const groupContent = useGroupContent(route.groupId, route.version)
  // if (myAccount.data?.id !== route.accountId) {
  //   return null
  // }
  const frontId = groupContent.data?.content['/']
  const id = frontId ? unpackHmId(frontId) : null
  if (route.tab !== 'front' && route.tab != null) return null
  if (!id?.qid) return null
  return (
    <EditDocButton
      docId={id?.qid || undefined}
      // baseVersion={id?.version || undefined}
      navMode="push"
      contextRoute={route}
      variants={[
        {
          key: 'group',
          groupId: route.groupId,
          pathName: '/',
        },
      ]}
    />
  )
}

export function GroupOptionsButton() {
  const route = useNavRoute()
  const groupRoute = route.key === 'group' ? route : null
  const groupRouteVersion = groupRoute?.version
  const groupId = groupRoute?.groupId
  if (!groupId || !groupRoute)
    throw new Error('GroupOptionsButton not supported in this route')
  const publish = usePublishGroupDialog()
  const myAccount = useMyAccount()
  const group = useGroup(groupId)
  const editInfo = useEditGroupInfoDialog()
  const groupContent = useGroupContent(groupId, groupRouteVersion)
  const isGroupOwner =
    myAccount.data?.id && group.data?.ownerAccountId === myAccount.data?.id
  const cloneGroup = useAppDialog(CloneGroupDialog)
  const deleteEntity = useDeleteDialog()
  const gwUrl = useGatewayUrl()
  const dispatch = useNavigationDispatch()
  const spawn = useNavigate('spawn')
  const menuItems: MenuItemType[] = [
    {
      key: 'clone',
      label: 'Clone Group',
      icon: Copy,
      onPress: () => {
        cloneGroup.open(groupId)
      },
    },
    {
      key: 'link',
      label: 'Copy Public Group URL',
      icon: Link,
      onPress: () => {
        const id = unpackHmId(groupId)
        if (!id) return
        copyTextToClipboard(
          createPublicWebHmUrl('g', id.eid, {
            version: groupRouteVersion,
            hostname: gwUrl.data,
          }),
        )
        toast.success('Copied Public Group URL')
      },
    },
    {
      key: 'delete',
      label: 'Delete Group',
      icon: Trash,
      onPress: () => {
        deleteEntity.open({
          id: groupId,
          title: group.data?.title,
          onSuccess: () => {
            dispatch({type: 'pop'})
          },
        })
      },
    },
    {
      key: 'openNewWindow',
      label: 'Open Front Document in New Window',
      icon: ArrowUpRight,
      onPress: () => {
        const frontId = groupContent.data?.content['/']
        const frontHmId = frontId ? unpackHmId(frontId) : null
        if (!frontHmId) return
        spawn({
          key: 'publication',
          documentId: frontHmId.qid,
          versionId: frontHmId.version || undefined,
          variants: [
            {
              key: 'group',
              groupId,
              pathName: '/',
            },
          ],
        })
      },
    },
  ]

  menuItems.push(useFavoriteMenuItem(groupId))

  // if (!isGroupOwner) return null // for now, this menu contains stuff for owners only. enable it for other people one day when it contains functionality for them
  if (isGroupOwner) {
    menuItems.push({
      key: 'publishSite',
      label: 'Publish Group to Site',
      icon: Send,
      onPress: () => {
        publish.open({
          groupId,
          publishedBaseUrl: group.data?.siteInfo?.baseUrl,
        })
      },
    })
    menuItems.push({
      key: 'editGroupInfo',
      label: 'Edit Group Info',
      icon: Pencil,
      onPress: () => {
        editInfo.open(groupId)
      },
    })
  }
  return (
    <>
      <OptionsDropdown menuItems={menuItems} />
      {publish.content}
      {deleteEntity.content}
      {editInfo.content}
      {cloneGroup.content}
    </>
  )
}

export function useFullReferenceUrl(route: NavRoute): {
  label: string
  url: string
  onCopy: (
    blockId?: string | undefined,
    blockRange?: BlockRange | ExpandedBlockRange,
  ) => void
  content: ReactNode
} | null {
  const pubRoute = route.key === 'publication' ? route : null
  const groupRoute = route.key === 'group' ? route : null
  const pub = usePublicationVariant({
    documentId: pubRoute?.documentId,
    versionId: pubRoute?.versionId,
    variants: pubRoute?.variants,
    enabled: !!pubRoute?.documentId,
  })
  const pubGroupVariants = pubRoute?.variants?.filter(
    (variant) => variant.key === 'group',
  ) as GroupVariant[] | undefined
  if (pubGroupVariants && pubGroupVariants.length > 1) {
    throw new Error('Multiple group variants not currently supported')
  }
  const pubGroupVariant: GroupVariant | undefined = pubGroupVariants?.[0]
  const variantGroupId = pubGroupVariant?.groupId
  const routeGroupId = groupRoute?.groupId
  const pubRouteDocId = pubRoute?.documentId
  const group = useGroup(variantGroupId || routeGroupId)
  const entityTimeline = useEntityTimeline(routeGroupId || pubRouteDocId)
  const invertedGroupContent = useInvertedGroupContent(variantGroupId)
  const gwUrl = useGatewayUrl()
  const [copyDialogContent, onCopyPublic, gatewayHost] =
    useCopyGatewayReference()

  if (groupRoute) {
    const groupId = unpackHmId(groupRoute.groupId)
    if (!groupId) return null
    const groupExactVersion = groupRoute?.version || group?.data?.version
    const baseUrl = group.data?.siteInfo?.baseUrl
    if (baseUrl) {
      const url = groupExactVersion
        ? `${baseUrl}/?v=${groupExactVersion}`
        : baseUrl
      return {
        label: 'Site',
        url,
        content: null,
        onCopy: () => {
          copyUrlToClipboardWithFeedback(url, 'Site')
        },
      }
    }
    let hostname = group.data?.siteInfo?.baseUrl || gwUrl.data
    return {
      label: 'Group',
      url: createPublicWebHmUrl('g', groupId.eid, {
        hostname: hostname || null,
        version: groupExactVersion || group.data?.version || null,
      }),
      content: copyDialogContent,
      onCopy: () => {
        onCopyPublic({
          ...groupId,
          hostname: hostname || null,
          version: groupExactVersion || group.data?.version || null,
        })
      },
    }
  }

  if (pubRoute) {
    const docId = unpackHmId(pubRoute.documentId)
    if (!docId) return null

    let hostname = variantGroupId ? group.data?.siteInfo?.baseUrl : gwUrl.data

    const entityVersion = pub.data?.publication?.version

    if (hostname && entityVersion && variantGroupId) {
      const matchedPrettyPath =
        invertedGroupContent.data?.[docId.eid]?.[entityVersion]
      if (matchedPrettyPath && !pubRoute.versionId) {
        const displayPrettyPath =
          matchedPrettyPath === '/' ? '' : matchedPrettyPath
        let sitePrettyUrl = `${hostname}/${displayPrettyPath}`
        // Version is temporarily disabled
        // if (groupVersion) {
        //   sitePrettyUrl += `?v=${groupVersion}`
        // }
        return {
          url: sitePrettyUrl,
          label: 'Site Document',
          content: null,
          onCopy: (
            blockId?: string | undefined,
            blockRange?: BlockRange | ExpandedBlockRange | null,
          ) => {
            console.log('=== COPY BLOCK', blockId)
            copyUrlToClipboardWithFeedback(
              blockId
                ? `${sitePrettyUrl}#${blockId}${serializeBlockRange(
                    blockRange,
                  )}`
                : sitePrettyUrl,
              'Site Document',
            )
          },
        }
      }
      if (hostname && entityTimeline.data && entityVersion) {
        const linkChangeIds = entityVersion.split('.')
        const allChanges = entityTimeline.data.allChanges
        const explicitlyHostedChangeIds = new Set(
          Object.keys(invertedGroupContent.data?.[docId.eid] || {})
            .map((version) => version.split('.'))
            .flat(),
        )
        const allHostedChangeIds = new Set<string>()
        let walkingHostedChangeIds = [...explicitlyHostedChangeIds]
        while (walkingHostedChangeIds.length) {
          walkingHostedChangeIds = walkingHostedChangeIds
            .map((changeId) => {
              allHostedChangeIds.add(changeId)
              const change = allChanges[changeId]
              if (!change) return []
              return change.deps
            })
            .flat()
        }

        if (
          linkChangeIds.find((changeId) => !allHostedChangeIds.has(changeId))
        ) {
          // this is the main purpose for all this code!
          // if the version is not hosted on this site, we should link to hyper.media by setting hostname to undefined
          hostname = undefined
          // also we want to clear the publication context from the route:
          // redirectedContext = null
        }
      }
      // if (redirectedContext !== undefined) {
      // this is causing buggy behavior. maybe we should show a visual indicator that this version doesn't actually appear in the group, rather than redirecting
      // navigateReplace({
      //   ...pubRoute,
      //   pubContext: redirectedContext,
      // })
      // }
    }
    return {
      url: createPublicWebHmUrl('d', docId.eid, {
        version: pub.data?.publication?.version,
        hostname,
      }),
      label: hostname ? 'Site Version' : 'Doc Version',
      content: copyDialogContent,
      onCopy: (
        blockId: string | undefined,
        blockRange?: BlockRange | ExpandedBlockRange | null,
      ) => {
        onCopyPublic({
          ...docId,
          hostname: hostname || null,
          version: pub.data?.publication?.version || null,
          blockRef: blockId || null,
          blockRange,
          variants: pubRoute.variants,
        })
      },
    }
  }

  if (route.key === 'account') {
    const accountId = hmId('a', route.accountId)
    return {
      label: 'Account',
      url: createPublicWebHmUrl('a', route.accountId, {
        hostname: gwUrl.data,
      }),
      content: copyDialogContent,
      onCopy: () => {
        onCopyPublic({
          ...accountId,
          hostname: gwUrl.data || null,
        })
      },
    }
  }

  const reference = getReferenceUrlOfRoute(route, gwUrl.data)
  if (!reference) return null
  return {
    ...reference,
    content: null,
    onCopy: () => {
      copyUrlToClipboardWithFeedback(reference.url, reference.label)
    },
  }
}

function getReferenceUrlOfRoute(
  route: NavRoute,
  hostname?: string | undefined,
  exactVersion?: string | undefined,
) {
  if (route.key === 'group') {
    const groupId = unpackHmId(route.groupId)
    if (!groupId || groupId.type !== 'g') return null
    const url = createPublicWebHmUrl('g', groupId.eid, {
      hostname,
      version: exactVersion,
    })
    return {
      label: 'Group',
      url,
    }
  }
  if (route.key === 'publication') {
    const docId = unpackHmId(route.documentId)
    if (!docId || docId.type !== 'd') return null
    const url = createPublicWebHmUrl('d', docId.eid, {
      version: exactVersion || route.versionId,
      hostname,
      variants: route.variants,
    })
    if (!url) return null
    return {
      label: 'Doc',
      url,
    }
  }
  if (route.key === 'account') {
    const url = createPublicWebHmUrl('a', route.accountId, {
      hostname,
      version: exactVersion,
    })
    if (!url) return null
    return {
      label: 'Account',
      url,
    }
  }
  return null
}

export function CopyReferenceButton() {
  const [shouldOpen, setShouldOpen] = useState(false)
  const route = useNavRoute()
  const reference = useFullReferenceUrl(route)
  const {externalOpen} = useAppContext()
  if (!reference) return null
  return (
    <>
      <Tooltip
        content={
          shouldOpen
            ? `Open ${reference.label}`
            : `Copy ${reference.label} Link`
        }
      >
        <Button
          onHoverOut={() => {
            setShouldOpen(false)
          }}
          aria-label={`${shouldOpen ? 'Open' : 'Copy'} ${reference.label} Link`}
          chromeless
          size="$2"
          icon={shouldOpen ? ExternalLink : Link}
          onPress={() => {
            if (shouldOpen) {
              setShouldOpen(false)
              externalOpen(reference.url)
            } else {
              setShouldOpen(true)
              // in theory we should save this timeout in a ref and deal with it upon unmount. in practice it doesn't matter
              setTimeout(() => {
                setShouldOpen(false)
              }, 5000)
              reference.onCopy()
            }
          }}
        />
      </Tooltip>
      {reference.content}
    </>
  )
}

function CreateDropdown({
  groupVariant,
}: {
  groupVariant?: GroupVariant
  key?: string
}) {
  const openDraft = useOpenDraft('push')
  const canEdit = useCanEditGroup(groupVariant?.groupId)
  if (groupVariant && !canEdit) return null
  const createGroup = useCreateGroupDialog()
  if (groupVariant && !canEdit) return null
  return (
    <>
      <OptionsDropdown
        menuItems={[
          {
            key: 'doc',
            label: 'New Document',
            icon: FileText,
            onPress: () => {
              openDraft(groupVariant)
            },
          },
          {
            key: 'group',
            label: 'New Group',
            icon: Book,
            onPress: () => {
              createGroup.open({})
            },
          },
        ]}
        button={
          <Button size="$2" icon={Plus}>
            Create
          </Button>
        }
      />
      {createGroup.content}
    </>
  )
}

export function PageActionButtons(props: TitleBarProps) {
  const route = useNavRoute()

  let buttonGroup: ReactNode[] = [<CreateDropdown key="create" />]
  if (route.key === 'draft') {
    buttonGroup = [<DraftPublicationButtons key="draftPublication" />]
  } else if (route.key == 'contacts') {
    buttonGroup = [
      <ContactsPrompt key="addContact" />,
      <CreateDropdown key="create" />,
    ]
  } else if (route.key == 'account' && route.tab === 'groups') {
    buttonGroup = [<CreateDropdown key="create" />]
  } else if (route.key == 'group') {
    buttonGroup = [
      <VersionContext key="versionContext" route={route} />,
      <EditGroupButton route={route} key="editGroup" />,
      <CreateDropdown
        key="create"
        groupVariant={{
          key: 'group',
          groupId: route.groupId,
          pathName: null,
        }}
      />,
      <GroupOptionsButton key="groupOptions" />,
    ]
  } else if (route.key === 'publication') {
    buttonGroup = [
      <VersionContext key="versionContext" route={route} />,
      <PublicationVariants key="variants" route={route} />,
      <CreateDropdown key="create" />,
      <DocOptionsButton key="options" />,
    ]
  } else if (route.key === 'account') {
    buttonGroup = [
      <EditAccountButton key="editAccount" />,
      <CreateDropdown key="create" />,
      <AccountOptionsButton key="accountOptions" />,
    ]
  }
  return <TitlebarSection>{buttonGroup}</TitlebarSection>
}

export function NavigationButtons() {
  const state = useNavigationState()
  const dispatch = useNavigationDispatch()
  if (!state) return null
  return (
    <XStack className="no-window-drag">
      <XGroup>
        <XGroup.Item>
          <Button
            size="$2"
            onPress={() => dispatch({type: 'pop'})}
            chromeless
            cursor={state.routeIndex <= 0 ? 'default' : 'pointer'}
            disabled={state.routeIndex <= 0}
            opacity={state.routeIndex <= 0 ? 0.5 : 1}
            icon={Back}
          />
        </XGroup.Item>
        <XGroup.Item>
          <Button
            size="$2"
            onPress={() => dispatch({type: 'forward'})}
            chromeless
            cursor={
              state.routeIndex >= state.routes.length - 1
                ? 'default'
                : 'pointer'
            }
            disabled={state.routeIndex >= state.routes.length - 1}
            opacity={state.routeIndex >= state.routes.length - 1 ? 0.5 : 1}
            icon={Forward}
          />
        </XGroup.Item>
      </XGroup>
    </XStack>
  )
}

export function NavMenuButton({left}: {left?: ReactNode}) {
  const ctx = useSidebarContext()
  const isLocked = useStream(ctx.isLocked)
  const isHoverVisible = useStream(ctx.isHoverVisible)
  let icon = Menu
  let tooltip = 'Lock Sidebar Open'
  let onPress = ctx.onLockSidebarOpen
  let key = 'lock'
  let color: undefined | ColorProp = undefined
  if (isLocked) {
    icon = ArrowLeftFromLine
    tooltip = 'Close Sidebar'
    onPress = ctx.onCloseSidebar
    key = 'close'
    color = '$color9'
  }
  if (!isLocked && isHoverVisible) {
    icon = ArrowRightFromLine
  }

  return (
    <XStack
      marginLeft="$2"
      // intention here is to hide the "close sidebar" button when the sidebar is locked, but the group="item" causes layout issues
      // group="item"
      justifyContent="space-between"
      width={
        isLocked
          ? SidebarWidth - 9 // not sure why this -9 is needed, but it makes the "close sidebar" button properly aligned with the sidebar width
          : 'auto'
      }
    >
      {left || <View />}
      <XStack position="relative" zIndex={1000} className="no-window-drag">
        <Tooltip
          content={tooltip}
          key={key} // use this key to make sure the component is unmounted when changes, to blur the button and make tooltip disappear
        >
          <Button
            backgroundColor="$colorTransparent"
            size="$2"
            key={key}
            icon={icon}
            color={color}
            // intention here is to hide the button when the sidebar is locked, but the group="item" causes layout issues
            // {...(key === 'close'
            //   ? {opacity: 0, '$group-item-hover': {opacity: 1}}
            //   : {})}
            chromeless={isLocked}
            onMouseEnter={ctx.onMenuHover}
            onMouseLeave={ctx.onMenuHoverLeave}
            onPress={onPress}
          />
        </Tooltip>
      </XStack>
    </XStack>
  )
}
