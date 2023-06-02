import {toast} from '@app/toast'
import {File as FileType, isFile} from '@mintter/shared'
import {
  Button,
  File as FileIcon,
  Label,
  Popover,
  SizableText,
  Tabs,
  XStack,
  YStack,
} from '@mintter/ui'
import {save} from '@tauri-apps/api/dialog'
import {BaseDirectory, writeBinaryFile} from '@tauri-apps/api/fs'
import {getClient, ResponseType} from '@tauri-apps/api/http'
import {appDataDir} from '@tauri-apps/api/path'
import {ChangeEvent, useEffect, useMemo, useState} from 'react'
import {Transforms} from 'slate'
import {
  ReactEditor,
  RenderElementProps,
  useFocused,
  useSelected,
  useSlateStatic,
} from 'slate-react'
import {EditorMode} from '../plugin-utils'
import {EditorPlugin} from '../types'
import {findPath} from '../utils'

interface InnerFileType extends FileType {
  size: number
}

type InnerFileProps = {
  file: InnerFileType
  assign: (file: InnerFileType) => void
  element: FileType
}

export const ELEMENT_FILE = 'file'

export function createFilePlugin(): EditorPlugin {
  return {
    name: ELEMENT_FILE,
    configureEditor(editor) {
      const {isVoid, isInline} = editor

      editor.isVoid = function fileIsVoid(element) {
        return isFile(element) || isVoid(element)
      }

      editor.isInline = function fileIsInline(element) {
        return isFile(element) || isInline(element)
      }

      return editor
    },
  }
}

export function FileElement({
  element,
  attributes,
  children,
}: RenderElementProps) {
  const editor = useSlateStatic()
  const path = ReactEditor.findPath(editor, element)
  const [file, setFile] = useState<InnerFileType>({
    name: undefined,
    size: 0,
    url: '',
    alt: '',
    children: [],
    type: 'file',
  } as InnerFileType)

  useEffect(() => {
    if ((element as FileType).url && !file.url) {
      ;(element as FileType).name
        ? setFile({
            ...file,
            url: (element as FileType).url,
            name: (element as FileType).name,
          })
        : setFile({...file, url: (element as FileType).url})
    }
  }, [])

  const assignFile = (newFile: InnerFileType) => {
    setFile({...file, ...newFile})
    Transforms.setNodes<FileType>(
      editor,
      {url: newFile.url, name: newFile.name},
      {at: path},
    )
  }

  if ((element as FileType).defaultOpen)
    Transforms.setNodes<FileType>(editor, {defaultOpen: false}, {at: path})

  return (
    <YStack {...attributes} className={element.type}>
      {children}
      {file.url.length ? (
        <FileComponent
          file={file}
          assign={assignFile}
          element={element as FileType}
        />
      ) : (
        <FileForm
          file={file}
          assign={assignFile}
          element={element as FileType}
        />
      )}
    </YStack>
  )
}

function FileComponent({assign, element, file}: InnerFileProps) {
  const editor = useSlateStatic()
  const selected = useSelected()
  const focused = useFocused()
  const [replace, setReplace] = useState(false)
  const path = useMemo(() => findPath(element), [element])

  const saveFile = async () => {
    const client = await getClient()
    const data = (
      await client.get(
        `http://localhost:55001/ipfs/${(element as FileType).url}`,
        {
          responseType: ResponseType.Binary,
        },
      )
    ).data as any

    const filePath = await save({
      defaultPath: (await appDataDir()) + '/' + file.name,
    })

    if (filePath) {
      try {
        await writeBinaryFile(filePath ? filePath : 'mintter-file', data, {
          dir: BaseDirectory.AppData,
        })
        toast.success(`Successfully downloaded file ${file.name}`)
      } catch (e) {
        toast.error(`Failed to download file ${file.name}`)
        console.log(e)
      }
    }
  }

  // const openFile = () => {
  //   const webview = new WebviewWindow(`File`, {
  //     url: `http://localhost:55001/ipfs/${(element as FileType).url}`,
  //   })
  //   webview.once('tauri://error', function (e) {
  //     console.log(e)
  //   })
  // }

  return (
    <YStack
      onHoverIn={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        setReplace(true)
      }}
      onHoverOut={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        setReplace(false)
      }}
    >
      {editor.mode == EditorMode.Draft && replace ? (
        <Button
          theme="white"
          position="absolute"
          top="$1.5"
          right="$2"
          zIndex="$4"
          size="$1"
          width={60}
          color="muted"
          onPress={() =>
            assign({
              name: undefined,
              size: 0,
              url: '',
              alt: '',
              children: [],
              type: 'file',
            } as InnerFileType)
          }
        >
          replace
        </Button>
      ) : editor.mode == EditorMode.Publication ? (
        <Button
          theme="white"
          position="absolute"
          top="$1.5"
          right="$2"
          zIndex="$4"
          size="$1"
          width={50}
          color="muted"
          onPress={saveFile}
        >
          save
        </Button>
      ) : null}
      <Button
        theme="gray"
        borderRadius={1}
        size="$5"
        justifyContent="flex-start"
        icon={FileIcon}
        disabled
      >
        {file.name}
      </Button>
    </YStack>
  )
}

function FileForm({assign, element}: InnerFileProps) {
  const [tabState, setTabState] = useState('upload')
  const [fileName, setFileName] = useState<{name: string; color: string}>({
    name: 'Upload File',
    color: 'black',
  })

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const uploadedFile = event.target.files[0]
      if (uploadedFile && uploadedFile.size <= 62914560) {
        const {size, name} = uploadedFile
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
          assign({url: data, size: size, name: name} as InnerFileType)
        } catch (error) {
          console.error(error)
        }
      } else setFileName({name: 'The file size exceeds 60 MB', color: 'red'})
    }
  }

  return (
    //@ts-ignore
    <YStack contentEditable={false} position="relative">
      <Popover
        placement="bottom"
        size="$5"
        defaultOpen={element.defaultOpen}
        stayInFrame
      >
        <Popover.Trigger asChild>
          <Button
            icon={FileIcon}
            theme="gray"
            borderRadius={0}
            size="$5"
            justifyContent="flex-start"
          >
            Add a File
          </Button>
        </Popover.Trigger>
        <Popover.Content
          padding={0}
          elevation="$4"
          size="$5"
          x={0}
          y={0}
          opacity={1}
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
                  Upload
                </SizableText>
              </Tabs.Tab>
              {/* <Tabs.Tab
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
                <SizableText size="$2" color='black'>Embed Link</SizableText>
              </Tabs.Tab> */}
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
                  />
                </XStack>
              </XStack>
            </Tabs.Content>
            {/* <Tabs.Content value="embed">
              <SizableText padding="$4" alignItems="center" backgroundColor='white'>Just test</SizableText>
            </Tabs.Content> */}
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
                <Input placeholder="Add an Image URL" name="url" />
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
  )
}
