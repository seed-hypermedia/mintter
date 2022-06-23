import {mainService as defaultMainService} from '@app/app-providers'
import {MINTTER_LINK_PREFIX} from '@app/constants'
import {BlockTools} from '@app/editor/block-tools'
import {Dropdown, ElementDropdown} from '@app/editor/dropdown'
import {useHover} from '@app/editor/hover-context'
import {EditorMode} from '@app/editor/plugin-utils'
import {useFile} from '@app/file-provider'
import {createPublicationMachine} from '@app/publication-machine'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {debug} from '@app/utils/logger'
import {useBookmarksService} from '@components/bookmarks'
import {Box} from '@components/box'
import {Icon} from '@components/icon'
import {Text} from '@components/text'
import {FlowContent, isCode, isHeading} from '@mintter/mttast'
import {useActor} from '@xstate/react'
import {useMemo} from 'react'
import toast from 'react-hot-toast'
import {RenderElementProps} from 'slate-react'
import {StateFrom} from 'xstate'

function useCitations(
  state: StateFrom<ReturnType<typeof createPublicationMachine>>,
  blockId: string,
) {
  return useMemo(() => {
    if (state.context.links) {
      return state.context.links.filter(
        (link) => link.target?.blockId == blockId,
      )
    }

    return []
  }, [state])
}

export function BlockWrapper({
  attributes,
  element,
  children,
  mode,
}: Omit<RenderElementProps, 'element'> & {
  mode: EditorMode
  element: FlowContent
  mainService?: typeof defaultMainService
}) {
  const bookmarksService = useBookmarksService()
  const hoverService = useHover()
  const [hoverState, hoverSend] = useActor(hoverService)
  let fileRef = useFile()
  let [fileState] = useActor(fileRef)
  let citations = useCitations(fileState, element.id)
  async function onCopy() {
    if (fileState.context.version) {
      let {documentId, version} = fileState.context
      //@ts-ignore
      await copyTextToClipboard(
        `${MINTTER_LINK_PREFIX}${documentId}/${version}/${element.id}`,
      )
      toast.success('Statement Reference copied successfully', {
        position: 'top-center',
      })
    } else {
      toast.error('Cannot Copy Block ID')
    }
  }

  function addBookmark() {
    debug('ADD BOOKMARK IN BLOCK')
    bookmarksService.send({
      type: 'BOOKMARK.ADD',
      url: `${MINTTER_LINK_PREFIX}${fileState.context.documentId}/${fileState.context.version}/${element.id}`,
    })
  }

  return mode == EditorMode.Draft ? (
    <Box
      css={{
        width: '$full',
        position: 'relative',
        maxWidth: '$prose-width',
        userSelect: 'none',
        paddingTop: '$4',
      }}
      onMouseEnter={() => {
        hoverSend({type: 'MOUSE_ENTER', blockId: element.id})
      }}
      {...attributes}
    >
      <Box
        as="span"
        contentEditable={false}
        css={{
          userSelect: 'none',
          position: 'absolute',
          height: isHeading(element) ? 'inherit' : '$full',
          left: -30,
          top: isCode(element) ? 12 : 16,
        }}
      >
        <BlockTools element={element} />
      </Box>
      <Box
        css={{
          width: '$full',
          maxWidth: '$prose-width',
          userSelect: 'text',
        }}
      >
        {children}
      </Box>
    </Box>
  ) : (
    <Box
      css={{
        width: '$full',
        position: 'relative',
        maxWidth: '$prose-width',
        userSelect: 'none',
        paddingTop: '$4',
      }}
      onMouseEnter={() => {
        hoverSend({type: 'MOUSE_ENTER', blockId: element.id})
      }}
    >
      <Dropdown.Root
        modal={false}
        onOpenChange={(value) => {
          if (!value) {
            hoverSend('MOUSE_LEAVE')
          }
        }}
      >
        <Dropdown.Trigger asChild>
          <ElementDropdown
            css={{
              opacity: 0,
              [`[data-hover-block="${element.id}"] &`]: {
                opacity: hoverState.matches('active') ? 1 : 0,
              },
              position: 'absolute',
              right: -20,
              top: 4,
            }}
          >
            <Icon name="MoreHorizontal" size="1" color="muted" />
          </ElementDropdown>
        </Dropdown.Trigger>
        <Dropdown.Content alignOffset={-5} align="end">
          <Dropdown.Item onSelect={onCopy}>
            <Icon name="Copy" size="1" />
            <Text size="2">Copy Block ID</Text>
          </Dropdown.Item>
          <Dropdown.Item onSelect={addBookmark}>
            <Icon size="1" name="ArrowBottomRight" />
            <Text size="2">Add to Bookmarks</Text>
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
      {children}
      {citations.length ? (
        <Box
          contentEditable={false}
          css={{
            padding: '$4',
            width: '$full',
            maxWidth: 240,
            marginTop: '-$4',
            display: 'none',
            '@bp2': {
              display: 'block',
              transform: 'translateX(100%)',
              position: 'absolute',
              right: -12,
              top: 4,
              overflow: 'hidden',
            },
          }}
        >
          <Box
            css={{
              width: 24,
              height: 24,
              borderRadius: '$2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '$base-component-bg-normal',
              // background: 'green',
              fontFamily: '$base',
              fontSize: '$1',
              color: '$base-text-low',
              textAlign: 'center',
              '& span': {
                background: '$primary-component-bg-active',
                display: 'block',
              },
            }}
          >
            {citations.length}
          </Box>
        </Box>
      ) : null}
    </Box>
  )
}

export function useOnScreen(ref: MutableRefObject<any>, rootMargin = '0px') {
  const [isVisible, setState] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setState(entry.isIntersecting)
      },
      {rootMargin},
    )
    if (ref && ref.current) {
      observer.observe(ref.current)
    }
    return () => {
      observer.unobserve(ref.current)
    }
  }, [])
  return isVisible
}
