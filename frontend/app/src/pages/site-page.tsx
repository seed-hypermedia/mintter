import {MINTTER_LINK_PREFIX} from '@app/constants'
import {Dropdown, ElementDropdown} from '@app/editor/dropdown'
import {usePublication, useAuthor} from '@app/hooks'
import {useSitePublications} from '@app/hooks/sites'
import {
  useNavigate,
  useNavigationActions,
  useNavRoute,
} from '@app/utils/navigation'
import {EmptyList} from '@components/empty-list'
import Footer from '@components/footer'
import {Icon} from '@components/icon'
import PageContainer from '@components/page-container'
import {Text} from '@components/text'
import {useUnpublishDialog} from '@components/unpublish-dialog'
import {WebPublicationRecord, formattedDate} from '@mintter/shared'
import copyTextToClipboard from 'copy-text-to-clipboard'
import {useMemo} from 'react'
import {toast} from 'react-hot-toast'
import '../styles/file-list.scss'
import {PageProps} from './base'

export default function SitePage(props: PageProps) {
  const route = useNavRoute()

  const host = route.key === 'site' ? route.hostname : undefined

  let {data, isInitialLoading} = useSitePublications(host)

  const sortedPubs = useMemo(() => {
    // sort path === '/' to the top
    // sort path === '' to the bottom
    return data?.publications.sort((a, b) => {
      if (a.path === '/') return -1
      if (b.path === '/') return 1
      if (a.path === '') return 1
      if (b.path === '') return -1
      return 0
    })
  }, [data])
  const nav = useNavigationActions()
  if (!host) throw new Error('Hostname not found for SitePage')

  return (
    <>
      <PageContainer>
        {isInitialLoading ? (
          <p>loading...</p>
        ) : sortedPubs?.length ? (
          sortedPubs.map((publication) => (
            <WebPublicationListItem
              key={publication.documentId}
              webPub={publication}
              hostname={host}
            />
          ))
        ) : (
          <EmptyList
            description={`Nothing published on ${host} yet.`}
            action={() => {
              nav.openNewDraft(false)
            }}
          />
        )}
      </PageContainer>
      <Footer />
    </>
  )
}

function WebPublicationListItem({
  webPub,
  hostname,
}: {
  hostname: string
  webPub: WebPublicationRecord
}) {
  const navigate = useNavigate()
  function goToItem() {
    navigate({
      key: 'publication',
      documentId: webPub.documentId,
      versionId: webPub.version,
    })
  }
  const [unpublishDialog, onUnpublishClick] = useUnpublishDialog(
    hostname,
    webPub,
  )
  const {data: publication} = usePublication(webPub.documentId, webPub.version)
  const {data: author} = useAuthor(publication?.document?.author)
  return (
    <li className="list-item">
      {webPub.path === '' ? (
        <p onClick={goToItem} className="item-title low">
          {publication?.document?.title}
        </p>
      ) : webPub.path === '/' ? (
        <p onClick={goToItem} className="item-title">
          {publication?.document?.title}
        </p>
      ) : (
        <p onClick={goToItem} className="item-title">
          /{webPub.path}
          <span className="item-sub-title">{publication?.document?.title}</span>
        </p>
      )}
      <span
        onClick={goToItem}
        data-testid="list-item-author"
        className={`item-author`}
      >
        {author?.profile?.alias}
      </span>
      <span
        onClick={goToItem}
        className="item-date"
        data-testid="list-item-date"
      >
        {publication?.document?.updateTime
          ? formattedDate(publication?.document?.updateTime)
          : '...'}
      </span>
      <span className="item-controls">
        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <ElementDropdown
              data-trigger
              className="dropdown"
              css={{
                backgroundColor: 'transparent',
              }}
            >
              <Icon
                name="MoreHorizontal"
                color="muted"
                // className={match ? hoverIconStyle() : undefined}
              />
            </ElementDropdown>
          </Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content
              align="start"
              data-testid="library-item-dropdown-root"
            >
              <Dropdown.Item
                data-testid="copy-item"
                onSelect={() => {
                  copyTextToClipboard(
                    `${MINTTER_LINK_PREFIX}${webPub.documentId}?v=${webPub.version}`,
                  )
                  toast.success('Document ID copied successfully')
                }}
              >
                <Icon name="Copy" />
                <Text size="2">Copy Document ID</Text>
              </Dropdown.Item>
              <Dropdown.Item
                data-testid="delete-item"
                onSelect={(e) => {
                  e.preventDefault()
                  onUnpublishClick()
                }}
              >
                <Icon name="Close" />
                <Text size="2">Un-Publish Document</Text>
              </Dropdown.Item>
              {unpublishDialog}
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      </span>
    </li>
  )
}
