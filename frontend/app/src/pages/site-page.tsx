import {MINTTER_LINK_PREFIX} from '@app/constants'
import {Dropdown, ElementDropdown} from '@app/editor/dropdown'
import {useSitePublications} from '@app/hooks/sites'
import {formattedDate} from '@app/utils/get-format-date'
import {openNewDraft} from '@app/utils/navigation'
import {EmptyList} from '@components/empty-list'
import {Icon} from '@components/icon'
import {Text} from '@components/text'
import {useUnpublishDialog} from '@components/unpublish-dialog'
import {ListedWebPublication} from '@mintter/shared/dist/client/.generated/site/v1alpha/site'
import {ScrollArea} from '@radix-ui/react-scroll-area'
import copyTextToClipboard from 'copy-text-to-clipboard'
import {toast} from 'react-hot-toast'
import {useLocation, useRoute} from 'wouter'

export default function SitePage() {
  let [, params] = useRoute('/sites/:hostname')
  const host = params?.hostname

  let {data, isInitialLoading} = useSitePublications(host)

  if (!host) throw new Error('Hostname not found for SitePage')

  return (
    <div className="page-wrapper">
      <ScrollArea>
        {isInitialLoading ? (
          <p>loading...</p>
        ) : data && data.publications.length ? (
          <ul className="file-list" data-testid="files-list">
            {data.publications.map((publication) => (
              <WebPublicationListItem
                key={publication.docId}
                publication={publication}
                hostname={host}
              />
            ))}
          </ul>
        ) : (
          <EmptyList
            description={`Nothing published on ${host} yet.`}
            action={() => {
              openNewDraft()
            }}
          />
        )}
      </ScrollArea>
    </div>
  )
}

function WebPublicationListItem({
  publication,
  hostname,
}: {
  hostname: string
  publication: ListedWebPublication
}) {
  const [, setLocation] = useLocation()
  function goToItem() {
    setLocation(`/p/${publication.docId}`)
  }
  const [unpublishDialog, onUnpublishClick] = useUnpublishDialog(
    hostname,
    publication,
  )
  return (
    <li className="list-item">
      {publication.path == null ? (
        <p onClick={goToItem} className="item-title low">
          {publication.docTitle}
        </p>
      ) : publication.path === '' ? (
        <p onClick={goToItem} className="item-title">
          {publication.docTitle}
        </p>
      ) : (
        <p onClick={goToItem} className="item-title">
          /{publication.path}
          <span className="item-sub-title">{publication.docTitle}</span>
        </p>
      )}
      <span
        onClick={goToItem}
        data-testid="list-item-author"
        className={`item-author`}
      >
        {publication.authorName}
      </span>
      <span
        onClick={goToItem}
        className="item-date"
        data-testid="list-item-date"
      >
        {publication.updateTime ? formattedDate(publication.updateTime) : '...'}
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
                    `${MINTTER_LINK_PREFIX}${publication.docId}`,
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
