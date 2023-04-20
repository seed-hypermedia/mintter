import {imageMachine} from '@app/editor/image/image-machine'
import {EditorMode} from '@app/editor/plugin-utils'
import {findPath, isValidUrl} from '@app/editor/utils'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Icon} from '@components/icon'
import {TextField} from '@components/text-field'
import {
  Image as ImageType,
  isFlowContent,
  isImage,
  paragraph,
  statement,
  text,
} from '@mintter/shared'
import {Image as UImage, SizableText} from '@mintter/ui'
import {useActor, useInterpret} from '@xstate/react'
import {FormEvent, useMemo} from 'react'
import {Editor, Path, Transforms} from 'slate'
import {
  ReactEditor,
  RenderElementProps,
  useFocused,
  useSelected,
  useSlateStatic,
} from 'slate-react'
import {ActorRefFrom} from 'xstate'
import type {EditorPlugin} from '../types'

export const ELEMENT_IMAGE = 'image'

export function createImagePlugin(): EditorPlugin {
  return {
    name: ELEMENT_IMAGE,
    renderElement:
      () =>
      ({element, children, attributes}) => {
        if (isImage(element)) {
          return (
            <Image element={element} attributes={attributes}>
              {children}
            </Image>
          )
        }
      },
    configureEditor(editor) {
      const {isVoid, isInline} = editor

      editor.isVoid = function imageVoid(element) {
        return isImage(element) || isVoid(element)
      }

      editor.isInline = function imageInline(element) {
        return isImage(element) || isInline(element)
      }

      return editor
    },
  }
}

function Image({element, attributes, children}: RenderElementProps) {
  const editor = useSlateStatic()
  const path = ReactEditor.findPath(editor, element)
  const imgService = useInterpret(() => imageMachine, {
    //@ts-ignore
    actions: {
      assignValidUrl: (_, event) => {
        Transforms.setNodes<ImageType>(editor, {url: event.data}, {at: path})
      },
      updateCaption: (_, event) => {
        Transforms.setNodes<ImageType>(editor, {alt: event.value}, {at: path})
      },
    },
    guards: {
      hasImageUrl: () => !!(element as ImageType).url,
    },
    services: {
      validateUrlService: (_, event) => {
        return isValidUrl(event.value)
      },
    },
  })

  const [state] = useActor(imgService)

  return (
    <Box css={{zIndex: '$max'}} {...attributes}>
      {children}
      {state.matches('image') ? (
        <ImageComponent service={imgService} element={element as ImageType} />
      ) : (
        <ImageForm service={imgService} element={element as ImageType} />
      )}
    </Box>
  )
}

type InnerImageProps = {
  service: ActorRefFrom<typeof imageMachine>
  element: ImageType
}

function ImageComponent({service, element}: InnerImageProps) {
  let [state, send] = useActor(service)
  const editor = useSlateStatic()
  const selected = useSelected()
  const focused = useFocused()
  const path = useMemo(() => findPath(element), [element])

  return (
    <Box
      css={{
        position: 'relative',
        '&:hover .hover-tools': {
          opacity: 1,
          visibility: 'visible',
          pointerEvents: 'inherit',
        },
      }}
    >
      {editor.mode == EditorMode.Draft ? (
        <Box
          className="hover-tools"
          css={{
            position: 'absolute',
            top: 0,
            right: '$3',
            transition: 'opacity 0.25s ease',
            zIndex: '$4',
            opacity: 0,
            visibility: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <Button
            size="1"
            color="muted"
            type="submit"
            onClick={() => send('IMAGE.REPLACE')}
          >
            replace
          </Button>
        </Box>
      ) : null}
      <UImage width="$100" height="$100" src={(element as ImageType).url} />
      {state.context.captionVisibility ? (
        <Box css={{marginHorizontal: '-$3', marginTop: '$1'}}>
          <TextField
            textarea
            size={1}
            rows={1}
            status="muted"
            placeholder="Media Caption"
            value={element.alt}
            onChange={(e) =>
              send({type: 'CAPTION.UPDATE', value: e.target.value})
            }
            onKeyDown={(event) => {
              if (event.key == 'Enter') {
                // This will create a new block below the image and focus on it

                event.preventDefault()

                let parentBlock = Editor.above(editor, {
                  match: isFlowContent,
                  at: path,
                })

                if (parentBlock) {
                  let [, pPath] = parentBlock
                  let newBlock = statement([paragraph([text('')])])
                  let newPath = Path.next(pPath)
                  Editor.withoutNormalizing(editor, () => {
                    Transforms.insertNodes(editor, newBlock, {at: newPath})
                    ReactEditor.focus(editor)
                    setTimeout(() => {
                      Transforms.select(editor, newPath)
                    }, 10)
                  })
                }
              }
            }}
          />
        </Box>
      ) : null}
    </Box>
  )
}

function ImageForm({service}: InnerImageProps) {
  const [state, send] = useActor(service)
  const selected = useSelected()
  const focused = useFocused()

  function submitImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    let formData = new FormData(event.currentTarget)
    let value: string = formData.get('url')?.toString() || ''
    send({type: 'IMAGE.SUBMIT', value})
  }

  return (
    <Box
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: '$3',
      }}
    >
      <Box
        contentEditable={false}
        css={{
          backgroundColor: '$base-component-bg-normal',
          boxShadow: selected && focused ? '0 0 0 3px #B4D5FF' : 'none',
          padding: '$5',
          display: 'flex',
          alignItems: 'center',
          '&:hover': {
            backgroundColor: '$base-component-bg-hover',
          },
        }}
      >
        <Box
          css={{
            flex: 'none',
            marginRight: '$5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="Image" size="2" />
        </Box>
        <Box
          as="form"
          css={{
            width: '$full',
            display: 'flex',
            alignItems: 'center',
            gap: '$4',
            whiteSpace: 'nowrap',
          }}
          onSubmit={submitImage}
        >
          <TextField type="url" placeholder="Add an Image URL" name="url" />
          <Button type="submit">Save</Button>
          <Button
            type="button"
            size="0"
            variant="ghost"
            color="muted"
            onClick={() => send('IMAGE.CANCEL')}
          >
            Cancel
          </Button>
        </Box>
      </Box>
      {state.context.errorMessage ? (
        <SizableText size="$1" theme="red">
          {state.context.errorMessage}
        </SizableText>
      ) : null}
    </Box>
  )
}
