import {MINTTER_LINK_PREFIX} from '@mintter/shared'
import {Dropdown} from '@app/editor/dropdown'
import {Find} from '@app/editor/find'
import {useDraftList} from '@app/hooks/documents'
import {MainActor} from '@app/hooks/main-actor'
import {useSiteList} from '@app/hooks/sites'
import {useDaemonReady} from '@app/node-status-context'
import {PublicationActor} from '@app/publication-machine'
import {
  useNavigate,
  useNavigationActions,
  useNavigationDispatch,
  useNavRoute,
} from '@app/utils/navigation'
import {hostnameStripProtocol} from '@app/utils/site-hostname'
import {ContactsPrompt} from '@components/contacts-prompt'
import {Icon} from '@components/icon'
import {Tooltip} from '@components/tooltip'
import {
  Button,
  Menu,
  XGroup,
  TitlebarSection,
  Add,
  Copy,
  Globe,
  Back,
  Forward,
  XStack,
  SizableText,
  Separator,
} from '@mintter/ui'
import {emit as tauriEmit} from '@tauri-apps/api/event'
import {useActor, useSelector} from '@xstate/react'
import copyTextToClipboard from 'copy-text-to-clipboard'
import toast from 'react-hot-toast'
import {TitleBarProps} from '.'
import {PublishShareButton} from './publish-share'

export function ActionButtons(props: TitleBarProps) {
  const nav = useNavigationActions()
  const route = useNavRoute()
  const isDaemonReady = useDaemonReady()

  const onCopy =
    route.key === 'publication'
      ? () => {
          let reference = `${MINTTER_LINK_PREFIX}${route.documentId}`
          if (route.versionId) reference += `?v=${route.versionId}`
          if (route.blockId) reference += `#${route.blockId}`
          copyTextToClipboard(reference)
          toast.success('Document reference copied!')
        }
      : undefined

  return (
    <TitlebarSection>
      <Find />

      {onCopy && (
        <Tooltip content="Copy document reference">
          <Button chromeless size="$2" onPress={onCopy} icon={Copy} />

          {/* </Button> */}
        </Tooltip>
      )}

      {route.key === 'publication' &&
      props.mainActor?.type === 'publication' ? (
        <WriteActions publicationActor={props.mainActor.actor} />
      ) : null}

      {props.mainActor ? (
        <PublishShareButton mainActor={props.mainActor} />
      ) : null}

      {route.key === 'draft' ? null : (
        <div className="button-group">
          {route.key === 'connections' ? (
            <ContactsPrompt />
          ) : (
            <Button
              size="$2"
              chromeless
              disabled={!isDaemonReady}
              iconAfter={Add}
              onPress={(e) => {
                e.preventDefault()
                // @ts-ignore
                nav.openNewDraft(!e.shiftKey)
              }}
            >
              Write
            </Button>
          )}
        </div>
      )}
    </TitlebarSection>
  )
}

export function NavigationButtons() {
  const dispatch = useNavigationDispatch()
  return (
    <XGroup>
      <XGroup.Item>
        <Button size="$2" onPress={() => dispatch({type: 'pop'})} chromeless>
          <Back size={16} />
        </Button>
      </XGroup.Item>
      <XGroup.Item>
        <Button
          size="$2"
          onPress={() => dispatch({type: 'forward'})}
          chromeless
        >
          <Forward size={16} />
        </Button>
      </XGroup.Item>
    </XGroup>
  )
}

export function SitesNavDropdownItems() {
  const sites = useSiteList()
  const navigate = useNavigate()

  if (!sites.data) return null
  if (sites.data.length == 0) return null
  return (
    <>
      <Separator />
      {sites.data.map((site) => (
        <Dropdown.Item
          key={site.hostname}
          onSelect={() => navigate({key: 'site', hostname: site.hostname})}
          asChild
        >
          <XStack alignItems="center">
            <Globe size={16} />
            <SizableText size="$2">
              {hostnameStripProtocol(site.hostname)}
            </SizableText>
          </XStack>
        </Dropdown.Item>
      ))}
    </>
  )
}

export function NavMenu({mainActor}: {mainActor?: MainActor}) {
  const route = useNavRoute()
  const navigate = useNavigate()
  const spawn = useNavigate('spawn')
  return (
    <XStack paddingRight="$2">
      <Dropdown.Root>
        <Dropdown.Trigger asChild>
          <Button size="$2" chromeless>
            <Menu size={16} />
          </Button>
        </Dropdown.Trigger>
        <Dropdown.Portal>
          <Dropdown.Content>
            <Dropdown.Item
              disabled={route.key === 'home'}
              data-testid="menu-item-inbox"
              onSelect={() => navigate({key: 'home'})}
            >
              <Icon name="File" />
              <span>All Publications</span>
              <Dropdown.RightSlot>&#8984; 1</Dropdown.RightSlot>
            </Dropdown.Item>
            <Dropdown.Item
              disabled={route.key === 'drafts'}
              data-testid="menu-item-drafts"
              onSelect={() => navigate({key: 'drafts'})}
            >
              <Icon name="PencilAdd" />
              <span>Drafts</span>
              <Dropdown.RightSlot>&#8984; 8</Dropdown.RightSlot>
            </Dropdown.Item>
            <Dropdown.Item
              disabled={route.key === 'connections'}
              onSelect={() => navigate({key: 'connections'})}
            >
              <Icon name="Person" />
              Connections
              <Dropdown.RightSlot>&#8984; 9</Dropdown.RightSlot>
            </Dropdown.Item>
            <SitesNavDropdownItems />
            <Separator />
            <Dropdown.Item onSelect={() => tauriEmit('open_quick_switcher')}>
              <Icon name="QuickSwitcher" />
              Quick Switcher
              <Dropdown.RightSlot>&#8984; K</Dropdown.RightSlot>
            </Dropdown.Item>
            <Dropdown.Item onSelect={() => spawn({key: 'settings'})}>
              <Icon name="GearOutlined" />
              Settings
              <Dropdown.RightSlot>&#8984; ,</Dropdown.RightSlot>
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown.Portal>
      </Dropdown.Root>
    </XStack>
  )
}

function WriteActions({
  publicationActor,
}: {
  publicationActor: PublicationActor
}) {
  // let canUpdate = useSelector(
  //   publicationActor,
  //   (state) => state.context.canUpdate,
  // )
  const draftList = useDraftList()
  const [pubState] = useActor(publicationActor)
  const hasExistingDraft = draftList.data?.documents.some(
    (draft) => draft.id === pubState.context.documentId,
  )
  let errorMessage = useSelector(
    publicationActor,
    (state) => state.context.errorMessage,
  )
  return (
    <>
      {publicationActor && (
        <Button
          chromeless
          size="$2"
          theme={hasExistingDraft ? 'yellow' : undefined}
          onPress={() => {
            publicationActor.send({type: 'PUBLICATION.EDIT'})
          }}
        >
          {hasExistingDraft ? 'Resume Editing' : 'Edit'}
          {errorMessage ? ' (failed)' : null}
        </Button>
      )}
    </>
  )
}
