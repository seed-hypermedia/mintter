import {imageMachine} from '@app/editor/image/image-machine'
import {EditorMode} from '@app/editor/plugin-utils'
import {findPath, isValidUrl} from '@app/editor/utils'
import {
  Image as ImageType,
  isFlowContent,
  isImage,
  paragraph,
  statement,
  text,
} from '@mintter/shared'
import {styled} from '@app/stitches.config'
import {useActor, useInterpret} from '@xstate/react'
import {ChangeEvent, FormEvent, useMemo, useState} from 'react'
import {Editor, Path, Transforms} from 'slate'
import {
  ReactEditor,
  RenderElementProps,
  useFocused,
  useSelected,
  useSlateStatic,
} from 'slate-react'
import {ActorRefFrom, assign} from 'xstate'
import type {EditorPlugin} from '../types'
import {
  Tabs,
  SizableText,
  Button,
  YStack,
  Popover,
  Text,
  XStack,
  Input,
  Form,
  ImageIcon,
} from '@mintter/ui'

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

const Img = styled('img', {
  display: 'block',
  maxWidth: '$full',
  width: '$full',
})

function Image({element, attributes, children}: RenderElementProps) {
  const editor = useSlateStatic()
  const path = ReactEditor.findPath(editor, element)
  const imgService = useInterpret(() => imageMachine, {
    //@ts-ignore
    actions: {
      assignValidUrl: (_, event) => {
        Transforms.setNodes<ImageType>(editor, {url: event.value}, {at: path})
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
        // return isValidUrl(event.value)
        // TODO: fix this so CIDs can be sotred in the image
        return 
      },
    },
  })

  const [state] = useActor(imgService)

  return (
    <YStack {...attributes}>
      {children}
      {state.matches('image') ? (
        <ImageComponent service={imgService} element={element as ImageType} />
      ) : (
        <ImageForm service={imgService} element={element as ImageType} />
      )}
    </YStack>
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
    <YStack>
      {editor.mode == EditorMode.Draft ? (
        <Button size="$1" color="muted" onPress={() => send('IMAGE.REPLACE')}>
          replace
        </Button>
      ) : null}
      <Img
        css={{
          boxShadow: selected && focused ? '0 0 0 3px #B4D5FF' : 'none',
        }}
        src={`http://localhost:55001/ipfs/${(element as ImageType).url}`}
      />
      {state.context.captionVisibility ? (
        <XStack>
          <Input
            placeholder="Media Caption"
            value={element.alt}
            onChangeText={(val) => send({type: 'CAPTION.UPDATE', value: val})}
            onKeyPress={(event) => {
              if (event.nativeEvent.key == 'Enter') {
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
        </XStack>
      ) : null}
    </YStack>
  )
}
// {service, onUploadSuccess}: {service: InnerImageProps["service"], onUploadSuccess?: (cid: string) => void}
function ImageForm({service}: InnerImageProps) {
  const [state, send] = useActor(service)
  const [tabState, setTabState] = useState('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const selected = useSelected()
  const focused = useFocused()

  function submitImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    let formData = new FormData(event.currentTarget)
    let value: string = formData.get('url')?.toString() || ''
    send({type: 'IMAGE.SUBMIT', value})
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files
    if (fileList) {
      setSelectedFile(fileList[0])
    }
    console.log(fileList)
  }

  const handleUpload = async () => {
    if (selectedFile) {
      const formData = new FormData()
      formData.append('file', selectedFile)

      try {
        const response = await fetch(
          'http://localhost:55001/ipfs/file-upload',
          {
            method: 'POST',
            body: formData,
          },
        )
        const data = await response.text()
        send({type: 'IMAGE.SUBMIT', value: data})
      } catch (error) {
        console.log('here')
        console.error(error)
      }
    }
  }

  return (
    <YStack contentEditable={false}>
      <Popover>
        <Popover.Trigger asChild>
          <Button
            icon={ImageIcon}
            theme="gray"
            borderRadius={0}
            size="$5"
            justifyContent="flex-start"
          >
            Add an image
          </Button>
        </Popover.Trigger>
        <Popover.Content top="-30px" padding={0} elevation="$4">
          <Tabs
            value={tabState}
            onValueChange={setTabState}
            orientation="horizontal"
            flexDirection="column"
          >
            <Tabs.List paddingBottom="$1.5" backgroundColor="white">
              <Tabs.Tab
                unstyled
                value="upload"
                paddingHorizontal="$4"
                paddingVertical="$2"
                borderBottomLeftRadius={0}
                borderBottomRightRadius={0}
                borderRadius={0}
                borderBottomColor={tabState == 'upload' ? 'black' : ''}
                borderBottomWidth={tabState == 'upload' ? '$1' : '$0'}
              >
                <SizableText size="$2">Upload Image</SizableText>
              </Tabs.Tab>
              {/* <Tabs.Tab
            unstyled
            value="embed"
            padding="$5"
            borderBottomLeftRadius={0}
            borderBottomRightRadius={0}
            borderRadius={0}
            borderBottomColor={tabState == 'embed' ? 'black' : ''}
            borderBottomWidth={tabState == 'embed' ? '$1' : '$0'}
          >
            <SizableText>Embed Link</SizableText>
          </Tabs.Tab> */}
            </Tabs.List>

            <Tabs.Content value="upload">
              <XStack padding="$4" alignItems="center">
                <XStack
                  tag="input"
                  type="file"
                  flex={1}
                  onChange={handleFileChange}
                />
                <Popover.Close asChild>
                  <Button
                    size="$2"
                    flex={0}
                    flexShrink={0}
                    theme="green"
                    onPress={handleUpload}
                  >
                    Save
                  </Button>
                </Popover.Close>
              </XStack>
            </Tabs.Content>
            {/* <Tabs.Content value="embed">
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
        </Tabs.Content> */}
          </Tabs>
        </Popover.Content>
      </Popover>
    </YStack>
    // <Box
    //   css={{
    //     display: 'flex',
    //     flexDirection: 'column',
    //     gap: '$3',
    //   }}
    // >
    //   <Box
    //     contentEditable={false}
    //     css={{
    //       backgroundColor: '$base-component-bg-normal',
    //       boxShadow: selected && focused ? '0 0 0 3px #B4D5FF' : 'none',
    //       padding: '$5',
    //       display: 'flex',
    //       alignItems: 'center',
    //       '&:hover': {
    //         backgroundColor: '$base-component-bg-hover',
    //       },
    //     }}
    //   >
    //     <Box
    //       css={{
    //         flex: 'none',
    //         marginRight: '$5',
    //         display: 'flex',
    //         alignItems: 'center',
    //         justifyContent: 'center',
    //       }}
    //     >
    //       <Icon name="Image" size="3" />
    //       <Box
    //         css={{
    //           flex: 'none',
    //           marginLeft: '$5',
    //           display: 'flex',
    //           alignItems: 'center',
    //           justifyContent: 'center',
    //         }}
    //       >
    //         Add an image
    //       </Box>
    //     </Box>
    //   </Box>
    //   {state.context.errorMessage ? (
    //     <Text color="danger" size={1} css={{userSelect: 'none'}}>
    //       {state.context.errorMessage}
    //     </Text>
    //   ) : null}
    //   <Tabs
    //     value={tabState}
    //     onValueChange={setTabState}
    //     orientation="horizontal"
    //     flexDirection="column"
    //     backgroundColor="white"
    //     borderRadius="$0"
    //     borderWidth="$0.25"
    //     borderColor="black"
    //   >
    //     <Tabs.List paddingBottom="$1.5" backgroundColor="white">
    //       <Tabs.Tab
    //         unstyled
    //         value="upload"
    //         padding="$5"
    //         borderBottomLeftRadius={0}
    //         borderBottomRightRadius={0}
    //         borderRadius={0}
    //         borderBottomColor={tabState == 'upload' ? 'black' : ''}
    //         borderBottomWidth={tabState == 'upload' ? '$1' : '$0'}
    //       >
    //         <SizableText>Upload Image</SizableText>
    //       </Tabs.Tab>
    //       {/* <Tabs.Tab
    //         unstyled
    //         value="embed"
    //         padding="$5"
    //         borderBottomLeftRadius={0}
    //         borderBottomRightRadius={0}
    //         borderRadius={0}
    //         borderBottomColor={tabState == 'embed' ? 'black' : ''}
    //         borderBottomWidth={tabState == 'embed' ? '$1' : '$0'}
    //       >
    //         <SizableText>Embed Link</SizableText>
    //       </Tabs.Tab> */}
    //     </Tabs.List>

    //     <Tabs.Content value="upload">
    //       <Box
    //         // as="form"
    //         css={{
    //           width: '$full',
    //           display: 'flex',
    //           alignItems: 'center',
    //           gap: '$4',
    //           whiteSpace: 'nowrap',
    //         }}
    //         // onSubmit={handleUpload}
    //       >
    //         {/* <Button> */}
    //         <input type="file" onChange={handleFileChange} />
    //         {/* </Button> */}
    //         {/* <TextField type="file" name="url" placeholder="Upload an image" disabled/> */}
    //         <TamaguiButton onPress={handleUpload}>Save</TamaguiButton>
    //       </Box>
    //     </Tabs.Content>
    //     {/* <Tabs.Content value="embed">
    //       <Box
    //         as="form"
    //         css={{
    //           width: '$full',
    //           display: 'flex',
    //           alignItems: 'center',
    //           gap: '$4',
    //         }}
    //         onSubmit={submitImage}
    //       >
    //         <TextField type="url" placeholder="Add an Image URL" name="url" />
    //         <Button type="submit">Save</Button>
    //         <Button
    //           type="button"
    //           size="0"
    //           variant="ghost"
    //           color="muted"
    //           onClick={() => send('IMAGE.CANCEL')}
    //         >
    //           Cancel
    //         </Button>
    //       </Box>
    //     </Tabs.Content> */}
    //   </Tabs>
    // </Box>
  )
}
