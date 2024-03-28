import {
  AuthorVariant,
  groupsVariantsMatch,
  GroupVariant,
  stringArrayMatch,
} from '@mintter/shared'
import {Home, Separator, toast, Tooltip, View, YGroup} from '@mintter/ui'
import {Contact, FileText, Library, Sparkles} from '@tamagui/lucide-icons'
import {useMyAccount} from '../models/accounts'
import {usePublication, usePublicationEmbeds} from '../models/documents'
import {usePins} from '../models/pins'
import {useHmIdToAppRouteResolver, useNavRoute} from '../utils/navigation'
import {useNavigate} from '../utils/useNavigate'
import {CreateGroupButton} from './new-group'
import {
  activeDocOutline,
  GenericSidebarContainer,
  getDocOutline,
  getRouteAccountId,
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
  onSelectAccountId,
}: {
  onSelectGroupId: null | ((groupId: string) => void)
  onSelectAccountId: null | ((accountId: string) => void)
}) {
  const route = useNavRoute()
  const navigate = useNavigate()
  const replace = useNavigate('replace')
  const account = useMyAccount()

  const pins = usePins()

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
  const publicationRoute = route.key === 'publication' ? route : null
  const activeDocId = publicationRoute?.documentId
  const unpinnedActiveDocId = pins.data?.documents.find(
    (pinned) => pinned.docId === activeDocId,
  )
    ? null
    : activeDocId
  const myAccount = useMyAccount()
  const activeAccountId = getRouteAccountId(route, myAccount.data)
  const unpinnedActiveAccountId = pins.data?.accounts.find(
    (pinned) => pinned === activeAccountId,
  )
    ? null
    : myAccount.data?.id === activeAccountId
    ? null
    : activeAccountId
  const accountRoute = route.key === 'account' ? route : null
  const activeBlock = accountRoute?.blockId
  const myProfileDoc = usePublication(
    {
      id: myAccount.data?.profile?.rootDocument,
    },
    {
      keepPreviousData: false,
    },
  )
  const myProfileDocEmbeds = usePublicationEmbeds(
    myProfileDoc.data,
    !!myProfileDoc.data,
    {skipCards: true},
  )
  const frontDocOutline = getDocOutline(
    myProfileDoc?.data?.document?.children || [],
    myProfileDocEmbeds,
  )
  const {outlineContent, isBlockActive} = activeDocOutline(
    frontDocOutline,
    activeBlock,
    myProfileDocEmbeds,
    (blockId) => {
      const myAccountId = myAccount.data?.id
      if (!myAccountId) return
      const accountRoute =
        route.key == 'account' && myAccountId === route.accountId ? route : null
      if (!accountRoute) {
        navigate({
          key: 'account',
          accountId: myAccountId,
          blockId,
        })
      } else {
        replace({
          ...accountRoute,
          blockId,
        })
      }
    },
    navigate,
  )
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
            <MyAccountItem
              active={
                route.key == 'account' &&
                route.accountId == myAccount.data?.id &&
                !isBlockActive
              }
              account={account.data}
              onRoute={navigate}
            />
          </YGroup.Item>
        )}
        <YGroup borderRadius={0}>{outlineContent}</YGroup>
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
              navigate({key: 'documents', tab: 'mine'})
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
        {unpinnedActiveDocId && publicationRoute ? (
          <SidebarDocument
            docId={unpinnedActiveDocId}
            isPinned={false}
            onPress={() => {}}
            pinVariants={publicationRoute.variants || []}
          />
        ) : null}
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
              isPinned={true}
              authors={pin.authors}
              active={
                route.key === 'publication' &&
                route.documentId === pin.docId &&
                pubAuthorVariantAuthors &&
                stringArrayMatch(pin.authors, pubAuthorVariantAuthors) &&
                groupsVariantsMatch(pin.groups, pubGroupVariants || [])
              }
              pinVariants={pin.authors.map((author) => ({
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
        {unpinnedActiveGroupRouteId && (
          <SidebarGroup
            group={{groupId: unpinnedActiveGroupRouteId}}
            isPinned={false}
            onPress={() => {
              onSelectGroupId?.(unpinnedActiveGroupRouteId)
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
                    isPinned={true}
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
        <YGroup.Item>
          <SidebarItem
            active={route.key == 'explore'}
            onPress={() => {
              navigate({key: 'explore', tab: 'docs'})
            }}
            title="Explore Content"
            bold
            icon={Sparkles}
            rightHover={[]}
          />
        </YGroup.Item>
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
        {unpinnedActiveAccountId ? (
          <PinnedAccount
            onPress={() => {
              onSelectAccountId?.(unpinnedActiveAccountId)
            }}
            accountId={unpinnedActiveAccountId}
            isPinned={false}
            active={true}
          />
        ) : null}
        {pins.data?.accounts.map((accountId) => {
          return (
            <PinnedAccount
              onPress={() => {
                if (accountId === activeAccountId && onSelectAccountId) {
                  onSelectAccountId(accountId)
                } else {
                  navigate({key: 'account', accountId})
                }
              }}
              active={accountId === activeAccountId}
              isPinned={true}
              accountId={accountId}
              key={accountId}
            />
          )
        })}
      </YGroup>
    </GenericSidebarContainer>
  )
}
