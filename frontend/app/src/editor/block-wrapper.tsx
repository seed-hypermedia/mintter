import {MINTTER_LINK_PREFIX} from '@app/constants'
import {BlockCitations} from '@app/editor/block-citations'
import {BlockTools} from '@app/editor/block-tools'
import {Dropdown, ElementDropdown} from '@app/editor/dropdown'
import {useHover} from '@app/editor/hover-context'
import {EditorMode} from '@app/editor/plugin-utils'
import {useParams} from '@app/main-page-context'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {useBookmarksService} from '@components/bookmarks'
import {Box} from '@components/box'
import {Icon} from '@components/icon'
import {Text} from '@components/text'
import {FlowContent, isCode, isHeading} from '@mintter/mttast'
import {useActor} from '@xstate/react'
import {MutableRefObject, useEffect, useState} from 'react'
import toast from 'react-hot-toast'
import {RenderElementProps} from 'slate-react'

export function BlockWrapper({
  attributes,
  element,
  children,
  mode,
}: Omit<RenderElementProps, 'element'> & {
  mode: EditorMode
  element: FlowContent
}) {
  const bookmarksService = useBookmarksService()
  const hoverService = useHover()
  const [, hoverSend] = useActor(hoverService)
  let params = useParams()

  async function onCopy() {
    if (mode == EditorMode.Discussion) {
      // noop
    }
    if (params) {
      //@ts-ignore
      await copyTextToClipboard(
        `${MINTTER_LINK_PREFIX}${params.docId}/${params.version}/${element.id}`,
      )
      toast.success('Statement Reference copied successfully', {
        position: 'top-center',
      })
    } else {
      toast.error('Cannot Copy Block ID')
    }
  }

  function addBookmark(
    docId: string,
    version: string,
    blockId: FlowContent['id'],
  ) {
    bookmarksService.send({
      type: 'BOOKMARK.ADD',
      url: `${MINTTER_LINK_PREFIX}${docId}/${version}/${blockId}`,
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
                opacity: 1,
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
          <Dropdown.Item
            onSelect={() => {
              //@ts-ignore
              addBookmark(params!.docId, params?.version, element.id)
            }}
          >
            <Icon size="1" name="ArrowBottomRight" />
            <Text size="2">Add to Bookmarks</Text>
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
      {children}
      <BlockCitations blockId={(element as FlowContent).id} />
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
