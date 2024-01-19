import {ContactsPrompt} from '@mintter/app/components/contacts-prompt'
import {copyUrlToClipboardWithFeedback} from '@mintter/app/copy-to-clipboard'
import {useMyAccount} from '@mintter/app/models/accounts'
import {usePublicationVariant} from '@mintter/app/models/publication'
import {
  NavRoute,
  useNavRoute,
  useNavigationDispatch,
  useNavigationState,
} from '@mintter/app/utils/navigation'
import {createPublicWebHmUrl, unpackHmId} from '@mintter/shared'
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
  useStream,
} from '@mintter/ui'
import {
  ArrowLeftFromLine,
  ArrowRightFromLine,
  Copy,
  ExternalLink,
  Link,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Send,
  UploadCloud,
} from '@tamagui/lucide-icons'
import copyTextToClipboard from 'copy-text-to-clipboard'
import {ReactNode, useState} from 'react'
import toast from 'react-hot-toast'
import {useAppContext} from '../app-context'
import {useEntityTimeline} from '../models/changes'
import {usePushPublication} from '../models/documents'
import {useGatewayHost, useGatewayUrl} from '../models/gateway-settings'
import {
  useCanEditGroup,
  useGroup,
  useInvertedGroupContent,
} from '../models/groups'
import {usePinAccount, usePinDocument, usePinGroup} from '../models/pins'
import {SidebarWidth, useSidebarContext} from '../src/sidebar-context'
import {GroupVariant} from '../utils/navigation'
import {useOpenDraft} from '../utils/open-draft'
import {CloneGroupDialog} from './clone-group'
import {useCopyGatewayReference} from './copy-gateway-reference'
import {useAppDialog} from './dialog'
import {useEditGroupInfoDialog} from './edit-group-info'
import {CreateGroupButton} from './new-group'
import {MenuItemType, OptionsDropdown} from './options-dropdown'
import {usePublishGroupDialog} from './publish-group'
import {TitleBarProps} from './titlebar'
import {DraftPublicationButtons, PublicationVariants} from './variants'

export function DocOptionsButton() {
  const route = useNavRoute()
  if (route.key !== 'publication')
    throw new Error(
      'DocOptionsButton can only be rendered on publication route',
    )
  const gwHost = useGatewayHost()
  const pin = usePinDocument(route)
  const push = usePushPublication()
  const [copyContent, onCopy, host] = useCopyGatewayReference()
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
        onCopy(id)
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
  ]
  if (pin.isPinned) {
    menuItems.push({
      key: 'unpin',
      label: 'Unpin from Sidebar',
      icon: PinOff,
      onPress: pin.unpin,
    })
  } else {
    menuItems.push({
      key: 'pin',
      label: 'Pin to Sidebar',
      icon: Pin,
      onPress: pin.pin,
    })
  }

  return (
    <>
      {copyContent}
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
  const pin = usePinAccount(route.accountId)
  const menuItems: MenuItemType[] = []
  if (pin.isPinned) {
    menuItems.push({
      key: 'unpin',
      label: 'Unpin from Sidebar',
      icon: PinOff,
      onPress: pin.unpin,
    })
  } else {
    menuItems.push({
      key: 'pin',
      label: 'Pin to Sidebar',
      icon: Pin,
      onPress: pin.pin,
    })
  }

  return (
    <>
      <OptionsDropdown menuItems={menuItems} />
    </>
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
  const pin = usePinGroup(groupId)
  const isGroupOwner =
    myAccount.data?.id && group.data?.ownerAccountId === myAccount.data?.id
  const cloneGroup = useAppDialog(CloneGroupDialog)
  const gwUrl = useGatewayUrl()
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
  ]
  if (pin.isPinned) {
    menuItems.push({
      key: 'unpin',
      label: 'Unpin from Sidebar',
      icon: PinOff,
      onPress: pin.unpin,
    })
  } else {
    menuItems.push({
      key: 'pin',
      label: 'Pin to Sidebar',
      icon: Pin,
      onPress: pin.pin,
    })
  }
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
      {editInfo.content}
      {cloneGroup.content}
    </>
  )
}

export function useFullReferenceUrl(route: NavRoute): {
  label: string
  url: string
  onCopy: (blockId?: string | undefined) => void
  content: ReactNode
} | null {
  const pubRoute = route.key === 'publication' ? route : null
  const groupRoute = route.key === 'group' ? route : null
  const pub = usePublicationVariant({
    documentId: pubRoute?.documentId,
    versionId: pubRoute?.versionId,
    variant: pubRoute?.variant,
    enabled: !!pubRoute?.documentId,
  })
  const variantGroupId =
    pubRoute?.variant?.key === 'group' ? pubRoute.variant.groupId : undefined
  const variantGroup = useGroup(variantGroupId)
  const routeGroupId = groupRoute?.groupId
  const pubRouteDocId = pubRoute?.documentId
  const group = useGroup(variantGroupId || routeGroupId)
  const entityTimeline = useEntityTimeline(routeGroupId || pubRouteDocId)
  const invertedGroupContent = useInvertedGroupContent(variantGroupId)
  const gwUrl = useGatewayUrl()
  const [copyDialogContent] = useCopyGatewayReference()

  if (groupRoute) {
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
    const ref = getReferenceUrlOfRoute(
      route,
      gwUrl.data,
      groupExactVersion || group.data?.version,
    )
    if (!ref) return null
    return {
      ...ref,
      content: null,
      onCopy: () => {
        copyUrlToClipboardWithFeedback(ref.url, ref.label)
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
          onCopy: (blockId?: string | undefined) => {
            copyUrlToClipboardWithFeedback(
              blockId ? `${sitePrettyUrl}#${blockId}` : sitePrettyUrl,
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
    let url = createPublicWebHmUrl('d', docId.eid, {
      version: pub.data?.publication?.version,
      hostname,
    })
    let label = hostname ? 'Site Version' : 'Doc Version'
    return {
      url,
      label,
      content: copyDialogContent,
      onCopy: (blockId: string | undefined) => {
        copyUrlToClipboardWithFeedback(
          blockId ? `${url}#${blockId}` : url,
          label,
        )
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

function NewDocumentButton({
  groupVariant,
  label,
}: {
  groupVariant?: GroupVariant
  label?: string
}) {
  const openDraft = useOpenDraft('push')
  const canEdit = useCanEditGroup(groupVariant?.groupId)
  if (groupVariant && !canEdit) return null
  return (
    <Tooltip content={`New ${label || 'Document'}`}>
      <Button
        size="$2"
        chromeless
        icon={Plus}
        onPress={(e) => {
          e.preventDefault()
          openDraft(groupVariant)
        }}
      >
        New Document
      </Button>
    </Tooltip>
  )
}

export function PageActionButtons(props: TitleBarProps) {
  const route = useNavRoute()

  let buttonGroup: ReactNode[] = []
  if (route.key === 'draft') {
    buttonGroup = [<DraftPublicationButtons key="draftPublication" />]
  } else if (route.key === 'documents') {
    buttonGroup = [
      <NewDocumentButton key="newDocument" groupVariant={undefined} />,
    ]
  } else if (route.key === 'contacts') {
    buttonGroup = [<ContactsPrompt key="addContact" />]
  } else if (route.key === 'groups') {
    buttonGroup = [
      <CreateGroupButton key="addGroup" triggerLabel="New Group" />,
    ]
  } else if (route.key === 'group') {
    buttonGroup = [
      <GroupOptionsButton key="groupOptions" />,
      <NewDocumentButton
        key="newDocument"
        label="Group Document"
        groupVariant={{
          key: 'group',
          groupId: route.groupId,
          pathName: null,
        }}
      />,
    ]
  } else if (route.key === 'publication') {
    buttonGroup = [
      <PublicationVariants key="variants" route={route} />,
      <DocOptionsButton key="options" />,
    ]
  } else if (route.key === 'account') {
    buttonGroup = [<AccountOptionsButton key="accountOptions" />]
  }
  return <TitlebarSection>{buttonGroup}</TitlebarSection>
}

export function PageContextControl(props: TitleBarProps) {
  return (
    <XStack className="no-window-drag">{/* <PageContextButton /> */}</XStack>
  )
}

export function NavigationButtons() {
  const state = useNavigationState()
  const dispatch = useNavigationDispatch()
  return (
    <XStack className="no-window-drag">
      <XGroup>
        <XGroup.Item>
          <Button
            size="$2"
            onPress={() => dispatch({type: 'pop'})}
            chromeless
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
