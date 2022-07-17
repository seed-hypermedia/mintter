import {mainService as defaultMainService} from '@app/app-providers'
import {Link} from '@app/client'
import {MINTTER_LINK_PREFIX} from '@app/constants'
import {BlockTools} from '@app/editor/block-tools'
import {useHover} from '@app/editor/hover-context'
import {EditorMode} from '@app/editor/plugin-utils'
import {findPath} from '@app/editor/utils'
import {useFile} from '@app/file-provider'
import {PublicationRef} from '@app/main-machine'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {debug, warn} from '@app/utils/logger'
import {useBookmarksService} from '@components/bookmarks'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Tooltip} from '@components/tooltip'
import {FlowContent, isHeading} from '@mintter/mttast'
import {useActor} from '@xstate/react'
import {MutableRefObject, useEffect, useMemo, useState} from 'react'
import toast from 'react-hot-toast'
import {RenderElementProps} from 'slate-react'

function useCitations(blockId: string) {
  let fileRef = useFile() as PublicationRef
  let [fileState] = useActor(fileRef)
  return useMemo(() => {
    let links: Array<Link> = []
    if (fileState.context.links) {
      links = fileState.context.links.filter(
        (link) => link.target?.blockId == blockId,
      )
    }

    return {
      links,
      fileRef,
      fileState,
    }
  }, [fileState])
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

  let {links: citations, fileState} = useCitations(element.id)
  let path = findPath(element)

  let show = useOnScreen(attributes.ref)

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
    bookmarksService.send({
      type: 'BOOKMARK.ADD',
      url: `${MINTTER_LINK_PREFIX}${fileState.context.documentId}/${fileState.context.version}/${element.id}`,
    })
  }

  return mode == EditorMode.Draft || mode == EditorMode.Embed ? (
    <Box
      {...attributes}
      css={{
        width: '$full',
        position: 'relative',
        userSelect: 'none',
        opacity: show ? 1 : 0,
        marginTop: isHeading(element) ? '$6' : '$4',
      }}
    >
      <Box
        as="span"
        contentEditable={false}
        onMouseEnter={() => {
          debug('block wrapper mouse enter:', element.id)
          hoverService.send({type: 'MOUSE_ENTER', blockId: element.id})
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
        marginTop: isHeading(element) ? '$6' : '$4',
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
export function useOnScreen(ref: MutableRefObject<any>, rootMargin = '100px') {
  const [isVisible, setState] = useState(false)
  useEffect(() => {
    let observer: IntersectionObserver | undefined = undefined
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        ([entry]) => {
          setState(entry.isIntersecting)
        },
        {rootMargin, threshold: 0.75},
      )
      if (ref && ref.current) {
        observer.observe(ref.current)
      }
    } else {
      warn('Intersection observer is not available in this browser')
      setState(true)
    }

    return () => {
      if (observer && ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [])
  return isVisible
}
