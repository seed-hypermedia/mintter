import {imageMachine} from '@app/editor/image/image-machine'
import {EditorMode} from '@app/editor/plugin-utils'
import {styled} from '@app/stitches.config'
import {debug} from '@app/utils/logger'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Icon} from '@components/icon'
import {Text} from '@components/text'
import {TextField} from '@components/text-field'
import {Image as ImageType, isImage} from '@mintter/mttast'
import {useActor, useInterpret} from '@xstate/react'
import {FormEvent} from 'react'
import {Transforms} from 'slate'
import {
  ReactEditor,
  RenderElementProps,
  useFocused,
  useSelected,
  useSlateStatic,
} from 'slate-react'
import {ActorRefFrom, assign} from 'xstate'
import type {EditorPlugin} from '../types'

export const ELEMENT_IMAGE = 'image'

export function createImagePlugin(): EditorPlugin {
  return {
    name: ELEMENT_IMAGE,
    renderElement:
      (editor) =>
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

const Img = styled('img', {
  display: 'block',
  maxWidth: '$full',
  width: '$full',
})

function Image({element, attributes, children}: RenderElementProps) {
  const editor = useSlateStatic()
  const path = ReactEditor.findPath(editor, element)
  debug('IMAGE HERE')
  const imgService = useInterpret(() => imageMachine, {
    actions: {
      assignImageNotValidError: assign({
        errorMessage: (c) => {
          console.log('ASSIGN ERROR!!')

          return `Image error: image url is not a valid URL: ${
            (element as ImageType).url
          }`
        },
      }),
      assignValidUrl: (_, event) => {
        Transforms.setNodes<ImageType>(editor, {url: event.data}, {at: path})
      },
      updateCaption: (_, event) => {
        Transforms.setNodes<ImageType>(editor, {alt: event.value}, {at: path})
      },
      assignCaptionVisibility: assign({
        captionVisibility: () => {
          debug(
            '\n\n=== captionVisibility',
            editor.mode == EditorMode.Draft
              ? true
              : !!(element as ImageType).alt,
          )
          return editor.mode == EditorMode.Draft
            ? true
            : !!(element as ImageType).alt
        },
      }),
    },
    guards: {
      hasImageUrl: () => !!(element as ImageType).url,
    },
    services: {
      validateImageUrl: (_, event) => {
        console.log('SERVICE CALL', event)

        return isImgUrl(event.value)
      },
    },
  })

  const [state] = useActor(imgService)

  return (
    <Box {...attributes}>
      {children}
      {state.matches('init') ? (
        <Box
          css={{
            padding: '$5',
            borderRadius: '$2',
            background: '$base-component-bg-normal',
          }}
        >
          <Text color="muted" size="3">
            Loading image...
          </Text>
        </Box>
      ) : null}
      {state.matches('image') ? (
        <ImageComponent service={imgService} element={element} />
      ) : null}
      {state.matches('editImage') ? (
        <ImageForm service={imgService} element={element} />
      ) : null}
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

  debug('IMAGE ALT', editor.mode, element.alt)

  return (
    <Box>
      <Img
        css={{
          boxShadow: selected && focused ? '0 0 0 3px #B4D5FF' : 'none',
        }}
        src={(element as ImageType).url}
      />
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
          />
        </Box>
      ) : null}
    </Box>
  )
}

function ImageForm({service, element}: InnerImageProps) {
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
          }}
          onSubmit={submitImage}
        >
          <TextField type="url" placeholder="Add an Image URL" name="url" />
          <Button type="submit">Save</Button>
        </Box>
      </Box>
      {state.context.errorMessage ? (
        <Text color="danger" size={1} css={{userSelect: 'none'}}>
          {state.context.errorMessage}
        </Text>
      ) : null}
    </Box>
  )
}

function isImgUrl(url: string): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    try {
      let imageUrl = new URL(url)
      resolve(imageUrl.toString())
    } catch (e) {
      reject(`IMAGE: Error: Invalid Image Url: ${url}`)
    }
  })
}
