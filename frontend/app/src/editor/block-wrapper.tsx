import {mainService as defaultMainService} from '@app/app-providers'
import {MINTTER_LINK_PREFIX} from '@app/constants'
import {BlockTools} from '@app/editor/block-tools'
import {useHover} from '@app/editor/hover-context'
import {EditorMode} from '@app/editor/plugin-utils'
import {useFile} from '@app/file-provider'
import {createPublicationMachine} from '@app/publication-machine'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {debug} from '@app/utils/logger'
import {useBookmarksService} from '@components/bookmarks'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Tooltip} from '@components/tooltip'
import {FlowContent} from '@mintter/mttast'
import {useActor} from '@xstate/react'
import {useMemo} from 'react'
import toast from 'react-hot-toast'
import {ReactEditor, RenderElementProps} from 'slate-react'
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
  let path = ReactEditor.findPath(fileState.context.editor, element)
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
      {...attributes}
      css={{
        width: '$full',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <Box
        as="span"
        contentEditable={false}
        onMouseEnter={() => {
          hoverSend({type: 'MOUSE_ENTER', blockId: element.id})
        }}
        css={{
          userSelect: 'none',
          position: 'absolute',
          display: 'block',
          left: `${(path.length - 2) * 16}px`,
        }}
      >
        <BlockTools element={element} />
      </Box>
      <Box
        css={{
          width: '$full',
          userSelect: 'text',
        }}
      >
        {children}
      </Box>
    </Box>
  ) : (
    <Box
      {...attributes}
      css={{
        width: '$full',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {children}
      <Box
        css={{
          position: 'absolute',
          right: '$4',
          top: 0,
          padding: '$2',
          display: 'flex',
          gap: '$2',
          alignItems: 'center',
        }}
      >
        <Box
          css={{
            opacity: 0,
            userSelect: 'none',
            visibility: 'hidden',
            transition: 'all ease-in-out 0.1s',
            [`[data-hover-block="${element.id}"] &`]: {
              opacity: 1,
              pointerEvents: 'all',
              visibility: 'visible',
            },
            '&:hover': {
              cursor: 'pointer',
            },
          }}
        >
          <Tooltip
            delayDuration={0}
            content={<span>{`Copy block reference: ${element.id}`}</span>}
          >
            <Button variant="ghost" size="0" color="primary" onClick={onCopy}>
              {element.id}
            </Button>
          </Tooltip>
        </Box>
        {citations.length ? (
          <Box
            css={{
              width: 24,
              height: 24,
              borderRadius: '$2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '$base-component-bg-normal',
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
        ) : null}
      </Box>
    </Box>
  )
}

// TODO: to avoid rendering when the block is not visible
// export function useOnScreen(ref: MutableRefObject<any>, rootMargin = '0px') {
//   const [isVisible, setState] = useState(false)

//   useEffect(() => {
//     const observer = new IntersectionObserver(
//       ([entry]) => {
//         setState(entry.isIntersecting)
//       },
//       {rootMargin},
//     )
//     if (ref && ref.current) {
//       observer.observe(ref.current)
//     }
//     return () => {
//       observer.unobserve(ref.current)
//     }
//   }, [])
//   return isVisible
// }
