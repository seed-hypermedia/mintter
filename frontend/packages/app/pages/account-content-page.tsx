import Footer from '@mintter/app/components/footer'
import {OnlineIndicator} from '@mintter/app/components/indicator'
import {PublicationListItem} from '@mintter/app/components/publication-list-item'
import {useAccountGroups} from '@mintter/app/models/groups'
import {useNavRoute} from '@mintter/app/utils/navigation'
import {
  Profile,
  abbreviateCid,
  createHmId,
  unpackDocId,
  unpackHmId,
} from '@mintter/shared'
import {
  List,
  ListItem,
  YGroup,
  YStack,
  copyTextToClipboard,
  toast,
} from '@mintter/ui'
import {ReactNode, useMemo} from 'react'
import {AccessoryLayout} from '../components/accessory-sidebar'
import {useCopyGatewayReference} from '../components/copy-gateway-reference'
import {useDeleteDialog} from '../components/delete-dialog'
import {copyLinkMenuItem} from '../components/list-item'
import {MainWrapperNoScroll} from '../components/main-wrapper'
import {useAllAccounts} from '../models/accounts'
import {useEntityMentions} from '../models/content-graph'
import {useAccountPublications} from '../models/documents'
import {useNavigate} from '../utils/useNavigate'
import {GroupListItem} from './groups'

function DeviceRow({
  isOnline,
  deviceId,
}: {
  isOnline: boolean
  deviceId: string
}) {
  return (
    <YGroup.Item>
      <ListItem
        onPress={() => {
          copyTextToClipboard(deviceId)
          toast.success('Copied Device ID to clipboard')
        }}
      >
        <OnlineIndicator online={isOnline} />
        {abbreviateCid(deviceId)}
      </ListItem>
    </YGroup.Item>
  )
}

function Section({children}: {children: ReactNode}) {
  return (
    <YStack
      borderBottomWidth={1}
      borderBottomColor="black"
      borderColor="$gray6"
      paddingVertical="$4"
      space
    >
      {children}
    </YStack>
  )
}

export function getAccountName(profile: Profile | undefined) {
  if (!profile) return ''
  return profile.alias || 'Untitled Account'
}

export default function AccountContentPage() {
  const route = useNavRoute()
  const accountContentRoute = route.key === 'account-content' ? route : null
  const accountId = accountContentRoute?.accountId
  if (accountContentRoute?.type === 'documents') {
    return <AccountPublications />
  } else if (accountContentRoute?.type === 'groups') {
    return <AccountGroups />
  }
  return null
}
function AccountPublications() {
  const route = useNavRoute()
  const accountContentRoute = route.key === 'account-content' ? route : null
  const accountId = accountContentRoute?.accountId
  if (!accountId) throw new Error('Invalid route, no account id')
  const replace = useNavigate('replace')
  const list = useAccountPublications(accountId)
  const accountEntityId = createHmId('a', accountId)
  const mentions = useEntityMentions(accountEntityId)
  const accounts = useAllAccounts()
  const data = useMemo(() => {
    function lookupAccount(accountId: string | undefined) {
      return (
        (accountId &&
          accounts.data?.accounts.find((acc) => acc.id === accountId)) ||
        accountId
      )
    }
    return list.data?.publications
      .sort((a, b) => {
        const aTime = a?.document?.publishTime
          ? new Date(a?.document?.publishTime).getTime()
          : undefined
        const bTime = b?.document?.publishTime
          ? new Date(b?.document?.publishTime).getTime()
          : undefined
        if (!aTime || !bTime) return 0
        return bTime - aTime
      })
      .map((pub) => {
        return {
          publication: pub,
          author: lookupAccount(pub?.document?.author),
          editors: pub?.document?.editors?.map(lookupAccount) || [],
        }
      })
  }, [list.data, accounts.data])
  const [copyDialogContent, onCopy] = useCopyGatewayReference()
  return (
    <>
      <AccessoryLayout accessory={null}>
        <MainWrapperNoScroll>
          <List
            header={null}
            items={data || []}
            renderItem={({item}) => {
              const {publication, author, editors} = item
              const docId = publication.document?.id
              if (!docId) return null
              return (
                <PublicationListItem
                  key={docId}
                  publication={publication}
                  hasDraft={undefined}
                  author={author}
                  editors={editors}
                  menuItems={() => [
                    copyLinkMenuItem(() => {
                      const id = unpackDocId(docId)
                      if (!id) return
                      onCopy({
                        ...id,
                        version: publication.version || null,
                        variants: [{key: 'author', author: accountId}],
                      })
                    }, 'Publication'),
                  ]}
                  openRoute={{
                    key: 'publication',
                    documentId: docId,
                    versionId: publication.version,
                    variants: [
                      {
                        key: 'author',
                        author: accountId,
                      },
                    ],
                  }}
                />
              )
            }}
          />
        </MainWrapperNoScroll>
      </AccessoryLayout>
      {copyDialogContent}
      <Footer></Footer>
    </>
  )
}

function AccountGroups() {
  const route = useNavRoute()
  const nav = useNavigate('push')
  const accountId = route.key === 'account-content' && route.accountId
  if (!accountId) throw new Error('Invalid route, no account id')
  const {data: groups} = useAccountGroups(accountId)
  const [copyDialogContent, onCopyId] = useCopyGatewayReference()
  const deleteDialog = useDeleteDialog()
  return (
    <>
      <MainWrapperNoScroll>
        {groups?.items ? (
          <List
            items={groups.items}
            renderItem={({item}) => (
              <GroupListItem
                group={item.group}
                onCopy={() => {
                  const groupId = unpackHmId(item?.group?.id)
                  if (!groupId) return
                  onCopyId(groupId)
                }}
                onDelete={deleteDialog.open}
              />
            )}
          />
        ) : null}
        {copyDialogContent}
        {deleteDialog.content}
      </MainWrapperNoScroll>
      <Footer></Footer>
    </>
  )
}
