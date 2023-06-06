import {imageMachine} from '@app/editor/image/image-machine'
import {EditorMode} from '@app/editor/plugin-utils'
import {findPath} from '@app/editor/utils'
import {
  Image as ImageType,
  isFlowContent,
  isImage,
  paragraph,
  statement,
  text,
} from '@mintter/shared'
import {
  Button,
  Form,
  ImageIcon,
  Input,
  Label,
  Popover,
  SizableText,
  Tabs,
  TextArea,
  XStack,
  YStack,
} from '@mintter/ui'
import {useActor, useInterpret} from '@xstate/react'
import {ChangeEvent, useCallback, useMemo, useState} from 'react'
import {Editor, Path, Transforms} from 'slate'
import {
  ReactEditor,
  RenderElementProps,
  useFocused,
  useSelected,
  useSlateStatic,
} from 'slate-react'
import {ActorRefFrom} from 'xstate'

export const ELEMENT_IMAGE = 'image'

export function ImageElement({
  element,
  attributes,
  children,
}: RenderElementProps) {
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
  })

  const uploadImage = async (url: string) => {
    if (isValidUrl(url)) {
      const blob = await fetch(url).then((res) => res.blob())
      const webFile = new File(
        [blob],
        `mintterImage.${blob.type.split('/').pop()}`,
      )
      if (webFile && webFile.size <= 62914560) {
        const formData = new FormData()
        formData.append('file', webFile)

        try {
          const response = await fetch(
            'http://localhost:55001/ipfs/file-upload',
            {
              method: 'POST',
              body: formData,
            },
          )
          const data = await response.text()
          Transforms.setNodes<ImageType>(
            editor,
            {url: `http://localhost:55001/ipfs/${data}`},
            {at: path},
          )
        } catch (error) {
          console.error(error)
        }
      }
    }
  }

  if (
    (element as ImageType).url &&
    !(element as ImageType).url.includes('ipfs')
  ) {
    const url = (element as ImageType).url
    uploadImage(url).catch((e) => console.log(e))
  }

  const [state] = useActor(imgService)
  if ((element as ImageType).defaultOpen)
    Transforms.setNodes<ImageType>(editor, {defaultOpen: false}, {at: path})

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
  const [replace, setReplace] = useState(false)
  const editor = useSlateStatic()
  const selected = useSelected()
  const focused = useFocused()
  const path = useMemo(() => findPath(element), [element])

  const onKeyPress = useCallback((event: any) => {
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
  }, [])

  return (
    <YStack
      className={element.type}
      onHoverIn={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        setReplace(true)
      }}
      onHoverOut={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        setReplace(false)
      }}
    >
      {editor.mode == EditorMode.Draft && replace ? (
        <Button
          theme="gray"
          position="absolute"
          top="$1.5"
          right="$1.5"
          zIndex="$4"
          size="$1"
          width={60}
          color="muted"
          onPress={() => send('IMAGE.REPLACE')}
        >
          replace
        </Button>
      ) : null}
      <img
        style={{
          boxShadow: selected && focused ? '0 0 0 3px #B4D5FF' : 'none',
        }}
        src={(element as ImageType).url}
      />
      <XStack>
        <TextArea
          size="$3"
          multiline={true}
          width="100%"
          placeholder="Media Caption"
          wordWrap="break-word"
          placeholderTextColor="grey"
          borderWidth="$0"
          focusStyle={{
            outlineWidth: '$0',
          }}
          backgroundColor="var(--base-background-normal)"
          value={element.alt}
          onChangeText={(val: string) =>
            send({type: 'CAPTION.UPDATE', value: val})
          }
          onKeyPress={onKeyPress}
          disabled={editor.mode != EditorMode.Draft}
        />
      </XStack>
    </YStack>
  )
}

function ImageForm({service, element}: InnerImageProps) {
  const [state, send] = useActor(service)
  const [tabState, setTabState] = useState('upload')
  const [url, setUrl] = useState('')
  const [fileName, setFileName] = useState<{name: string; color: string}>({
    name: 'Upload Image',
    color: 'black',
  })

  const submitImage = async (url: string) => {
    if (isValidUrl(url)) {
      const blob = await fetch(url).then((res) => res.blob())
      const webFile = new File(
        [blob],
        `mintterImage.${blob.type.split('/').pop()}`,
      )
      if (webFile && webFile.size <= 62914560) {
        const formData = new FormData()
        formData.append('file', webFile)

        try {
          const response = await fetch(
            'http://localhost:55001/ipfs/file-upload',
            {
              method: 'POST',
              body: formData,
            },
          )
          const data = await response.text()
          send({
            type: 'IMAGE.SUBMIT',
            value: `http://localhost:55001/ipfs/${data}`,
          })
        } catch (error) {
          console.error(error)
        }
      } else setFileName({name: 'The file size exceeds 60 MB', color: 'red'})
    }
  }

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const uploadedFile = event.target.files[0]
      if (uploadedFile && uploadedFile.size <= 62914560) {
        const formData = new FormData()
        formData.append('file', uploadedFile)

        try {
          const response = await fetch(
            'http://localhost:55001/ipfs/file-upload',
            {
              method: 'POST',
              body: formData,
            },
          )
          const data = await response.text()
          send({
            type: 'IMAGE.SUBMIT',
            value: `http://localhost:55001/ipfs/${data}`,
          })
        } catch (error) {
          console.error(error)
        }
      } else setFileName({name: 'The file size exceeds 60 MB', color: 'red'})
    }
  }

  return (
    //@ts-ignore
    <YStack contentEditable={false}>
      <Popover size="$5" defaultOpen={element.defaultOpen}>
        <Popover.Trigger asChild>
          <Button
            icon={ImageIcon}
            theme="gray"
            borderRadius={0}
            size="$5"
            justifyContent="flex-start"
            focusStyle={{
              outlineWidth: 0,
            }}
          >
            Add an image
          </Button>
        </Popover.Trigger>
        <Popover.Content
          padding={0}
          elevation="$4"
          size="$5"
          enterStyle={{x: 0, y: -1, opacity: 0}}
          exitStyle={{x: 0, y: -1, opacity: 0}}
          animation={[
            'quick',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
        >
          <Tabs
            value={tabState}
            onValueChange={setTabState}
            orientation="horizontal"
            flexDirection="column"
            borderWidth="$1"
            borderColor="white"
            borderRadius="$5"
            width={500}
          >
            <Tabs.List
              marginBottom="$-0.5"
              backgroundColor="white"
              borderBottomColor="lightgrey"
              borderBottomWidth="$1"
              borderBottomLeftRadius={0}
              borderBottomRightRadius={0}
              borderRadius={0}
            >
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
                hoverStyle={{
                  backgroundColor: 'lightgrey',
                  cursor: 'pointer',
                }}
              >
                <SizableText size="$2" color="black">
                  Upload Image
                </SizableText>
              </Tabs.Tab>
              <Tabs.Tab
                unstyled
                value="embed"
                paddingHorizontal="$4"
                paddingVertical="$2"
                borderBottomLeftRadius={0}
                borderBottomRightRadius={0}
                borderRadius={0}
                borderBottomColor={tabState == 'embed' ? 'black' : ''}
                borderBottomWidth={tabState == 'embed' ? '$1' : '$0'}
                hoverStyle={{
                  backgroundColor: 'lightgrey',
                  cursor: 'pointer',
                }}
              >
                <SizableText size="$2" color="black">
                  Embed Link
                </SizableText>
              </Tabs.Tab>
            </Tabs.List>
            <Tabs.Content value="upload">
              <XStack padding="$4" alignItems="center" backgroundColor="white">
                <XStack flex={1} backgroundColor="white">
                  <Label
                    htmlFor="file-upload"
                    borderColor="lightgrey"
                    borderWidth="$0.5"
                    size="$3"
                    width={500}
                    justifyContent="center"
                    hoverStyle={{
                      backgroundColor: 'lightgrey',
                      cursor: 'pointer',
                    }}
                  >
                    <SizableText
                      padding="$2"
                      overflow="hidden"
                      whiteSpace="nowrap"
                      textOverflow="ellipsis"
                      color={fileName.color}
                    >
                      {fileName.name}
                    </SizableText>
                  </Label>
                  <input
                    id="file-upload"
                    type="file"
                    style={{
                      background: 'white',
                      padding: '0 2px',
                      display: 'none',
                    }}
                    onChange={handleUpload}
                    accept="image/png, image/jpg, image/gif, image/jpeg"
                  />
                </XStack>
              </XStack>
            </Tabs.Content>
            <Tabs.Content value="embed">
              <XStack padding="$4" alignItems="center" backgroundColor="white">
                <Form
                  alignItems="center"
                  onSubmit={() => submitImage(url)}
                  borderWidth={0}
                >
                  <XStack>
                    <Input
                      width={380}
                      size="$3"
                      marginRight="$3"
                      borderColor="lightgrey"
                      borderWidth="$0.5"
                      borderRadius="$0"
                      color="black"
                      placeholder="Add an Image URL"
                      focusStyle={{
                        borderColor: 'lightgrey',
                        outlineWidth: 0,
                        cursor: 'pointer',
                      }}
                      onChange={(e) => setUrl(e.nativeEvent.text)}
                    />
                    <Form.Trigger asChild>
                      <Button
                        size="$3"
                        flex={0}
                        flexShrink={0}
                        theme={fileName.color === 'red' ? 'gray' : 'green'}
                        disabled={fileName.color === 'red' ? true : false}
                        focusStyle={{
                          outlineWidth: 0,
                        }}
                      >
                        Save
                      </Button>
                    </Form.Trigger>
                  </XStack>
                </Form>
              </XStack>
            </Tabs.Content>
          </Tabs>
        </Popover.Content>
      </Popover>
    </YStack>
  )
}

export function withImages(editor: Editor): Editor {
  const {isVoid, isInline} = editor

  editor.isVoid = function imageIsVoid(element) {
    return isImage(element) || isVoid(element)
  }

  editor.isInline = function imageIsInline(element) {
    return isImage(element) || isInline(element)
  }

  return editor
}

const isValidUrl = (urlString: string) => {
  try {
    return Boolean(new URL(urlString))
  } catch (e) {
    console.log(e)
    return false
  }
}
