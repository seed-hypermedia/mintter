import {
  AuthorVariant,
  groupsVariantsMatch,
  GroupVariant,
  stringArrayMatch,
} from '@mintter/shared'
import {Home, Separator, toast, Tooltip, View, YGroup} from '@mintter/ui'
import {
  Contact,
  FileText,
  Library,
  Search,
  Settings,
} from '@tamagui/lucide-icons'
import {useMyAccount} from '../models/accounts'
import {usePins} from '../models/pins'
import {useHmIdToAppRouteResolver, useNavRoute} from '../utils/navigation'
import {useNavigate} from '../utils/useNavigate'
import {useTriggerWindowEvent} from '../utils/window-events'
import {CreateGroupButton} from './new-group'
import {
  GenericSidebarContainer,
  getRouteGroupId,
  MyAccountItem,
  NewDocumentButton,
  PinnedAccount,
  SidebarDocument,
  SidebarGroup,
  SidebarItem,
} from './sidebar-base'

export function MainAppSidebar({
  onSelectGroupId,
}: {
  onSelectGroupId: null | ((groupId: string) => void)
}) {
  const route = useNavRoute()
  const navigate = useNavigate()
  const account = useMyAccount()

  const pins = usePins()

  const triggerFocusedWindow = useTriggerWindowEvent()

  const resolveId = useHmIdToAppRouteResolver()
  const pubRoute = route.key === 'publication' ? route : null
  const pubAuthorVariants = pubRoute?.variants?.filter(
    (variant) => variant.key === 'author',
  ) as AuthorVariant[] | undefined
  const pubGroupVariants = pubRoute?.variants?.filter(
    (variant) => variant.key === 'group',
  ) as GroupVariant[] | undefined
  if (pubGroupVariants && pubGroupVariants.length > 1) {
    throw new Error('Multiple group variants not currently supported')
  }
  if (
    pubAuthorVariants &&
    pubAuthorVariants.length > 1 &&
    pubGroupVariants &&
    pubGroupVariants.length > 1
  ) {
    throw new Error(
      'Combined author and group variants not currently supported',
    )
  }
  const pubGroupVariant = pubGroupVariants?.[0]
  const activeGroupRouteId = getRouteGroupId(route)
  const pubAuthorVariantAuthors = pubAuthorVariants?.map(
    (variant) => variant.author,
  )
  const unpinnedActiveGroupRouteId = pins.data?.groups.find(
    (pinnedGroup) => pinnedGroup.groupId === activeGroupRouteId,
  )
    ? null
    : activeGroupRouteId
  return (
    <GenericSidebarContainer>
      <YGroup
        separator={<Separator />}
        borderRadius={0}
        borderBottomWidth={1}
        borderColor="$borderColor"
      >
        {account.data && (
          <YGroup.Item>
            <MyAccountItem account={account.data} onRoute={navigate} />
          </YGroup.Item>
        )}
        <YGroup.Item>
          <SidebarItem
            active={route.key == 'feed'}
            onPress={() => {
              navigate({key: 'feed', tab: 'trusted'})
            }}
            title="Home Feed"
            bold
            icon={Home}
          />
        </YGroup.Item>
        <YGroup.Item>
          <SidebarItem
            active={route.key == 'documents'}
            data-testid="menu-item-global"
            onPress={() => {
              navigate({key: 'documents', tab: 'trusted'})
            }}
            title="Documents"
            bold
            icon={FileText}
            rightHover={[
              <NewDocumentButton key="newDoc" />,
              // <Button
              //   theme="blue"
              //   icon={Plus}
              //   size="$2"
              //   key="NewDoc"
              //   onPress={() => {}}
              // />,
            ]}
          />
        </YGroup.Item>
        {pins.data?.documents.map((pin) => {
          return (
            <SidebarDocument
              onPress={() => {
                navigate({
                  key: 'publication',
                  documentId: pin.docId,
                  variants: pin.authors.map((author) => ({
                    key: 'author',
                    author,
                  })),
                })
              }}
              authors={pin.authors}
              active={
                route.key === 'publication' &&
                route.documentId === pin.docId &&
                pubAuthorVariantAuthors &&
                stringArrayMatch(pin.authors, pubAuthorVariantAuthors) &&
                groupsVariantsMatch(pin.groups, pubGroupVariants || [])
              }
              variants={pin.authors.map((author) => ({
                key: 'author',
                author,
              }))}
              docId={pin.docId}
              key={`${pin.docId}.${pin.authors.join('.')}`}
            />
          )
        })}
        <YGroup.Item>
          <SidebarItem
            active={route.key == 'groups'}
            onPress={() => {
              navigate({key: 'groups'})
            }}
            title="Groups"
            bold
            icon={Library}
            rightHover={[
              <Tooltip content="New Group" key="newGroup">
                {/* Tooltip broken without this extra child View */}
                <View>
                  <CreateGroupButton chromeless />
                </View>
              </Tooltip>,
            ]}
          />
        </YGroup.Item>
        {unpinnedActiveGroupRouteId && onSelectGroupId && (
          <SidebarGroup
            group={{groupId: unpinnedActiveGroupRouteId}}
            isPinned={false}
            onPress={() => {
              onSelectGroupId(unpinnedActiveGroupRouteId)
            }}
          />
        )}
        {pins.data?.groups
          .map((group) => {
            return [
              <SidebarGroup
                group={group}
                key={group.groupId}
                isPinned={true}
                onPress={() => {
                  if (group.groupId === activeGroupRouteId && onSelectGroupId) {
                    onSelectGroupId(group.groupId)
                  } else {
                    navigate({key: 'group', groupId: group.groupId})
                  }
                }}
              />,
              ...group.documents.map((pin) => {
                if (!pin) return null
                const {pathName, docId, docVersion} = pin
                return (
                  <SidebarDocument
                    variants={[
                      {
                        key: 'group',
                        groupId: group.groupId,
                        pathName: pathName || '/',
                      },
                    ]}
                    onPress={async () => {
                      const resolved = await resolveId(
                        `${group.groupId}/${pathName}`,
                      )
                      if (resolved?.navRoute) {
                        navigate(resolved.navRoute)
                      } else {
                        toast.error(
                          `"${pathName}" not found in latest version of group`,
                        )
                      }
                    }}
                    active={
                      route.key === 'publication' &&
                      pubGroupVariant &&
                      pubGroupVariant.groupId === group.groupId &&
                      pubGroupVariant.pathName === pathName
                    }
                    docId={docId}
                    docVersion={docVersion}
                    key={pathName}
                  />
                )
              }),
            ]
          })
          .flat()}

        {/* <YGroup.Item>
              <SidebarItem
                active={route.key == 'drafts'}
                data-testid="menu-item-drafts"
                onPress={() => {
                  navigate({key: 'documents', tab: 'drafts' })
                }}
                icon={Draft}
                title="Drafts"
                bold
              />
            </YGroup.Item> */}
        <YGroup.Item>
          <SidebarItem
            active={route.key == 'contacts'}
            onPress={() => {
              navigate({key: 'contacts'})
            }}
            icon={Contact}
            title="Contacts"
            bold
          />
        </YGroup.Item>
        {pins.data?.accounts.map((accountId) => {
          return <PinnedAccount accountId={accountId} key={accountId} />
        })}
      </YGroup>
      <View f={1} minHeight={20} />
      <YGroup
        separator={<Separator />}
        borderRadius={0}
        borderTopWidth={1}
        borderColor="$borderColor"
      >
        <YGroup.Item>
          <SidebarItem
            onPress={() => {
              triggerFocusedWindow('openLauncher')
            }}
            title="Search / Open"
            icon={Search}
          />
        </YGroup.Item>
        <YGroup.Item>
          <SidebarItem
            onPress={() => {
              navigate({key: 'settings'})
            }}
            cursor="pointer"
            icon={Settings}
            title="Settings"
          />
        </YGroup.Item>
      </YGroup>
    </GenericSidebarContainer>
  )
}
