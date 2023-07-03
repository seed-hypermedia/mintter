import { Block, BlockNoteEditor, defaultProps } from "@app/blocknote-core";
import { getBlockInfoFromPos } from "@app/blocknote-core/extensions/Blocks/helpers/getBlockInfoFromPos";
import { insertOrUpdateBlock } from "@app/blocknote-core/extensions/SlashMenu/defaultSlashMenuItems";
import { createReactBlockSpec, ReactSlashMenuItem } from "@app/blocknote-react";
import { HDBlockSchema } from '@app/client/schema';
import { toast } from '@app/toast';
import { Button, Label, Popover, SizableText, Tabs, XStack, YStack } from "@mintter/ui";
import { save } from '@tauri-apps/api/dialog';
import { BaseDirectory, writeBinaryFile } from '@tauri-apps/api/fs';
import { getClient, ResponseType } from '@tauri-apps/api/http';
import { appDataDir } from '@tauri-apps/api/path';
import { ChangeEvent, useEffect, useState } from "react";
import { RiFile2Line } from "react-icons/ri";

export const FileBlock = createReactBlockSpec({
    type: "file",
    propSchema: {
      ...defaultProps,
      url: {
        default: "",
      },
      name: {
        default: "",
      },
      defaultOpen: {
        values: ["false", "true"],
        default: "true",
      },
    },
    containsInlineContent: true,
    // @ts-ignore
    render: ({ block, editor }: {block: Block<HDBlockSchema>, editor: BlockNoteEditor<HDBlockSchema>}) => (
      Render(block, editor)
    ),
  });

type FileType = {
  id: string,
  props: {
    url: string,
    name: string,
  }
  children: [],
  content: [],
  type: string,
}

const boolRegex = new RegExp("true");

const Render = (block: Block<HDBlockSchema>, editor: BlockNoteEditor<HDBlockSchema>) => {
  const [file, setFile] = useState<FileType>({
    id: block.id,
    props: {
      url: block.props.url,
      name: block.props.name,
    },
    children: [],
    content: block.content,
    type: block.type,
  } as FileType)

  const assignFile = (newFile: FileType) => {
    setFile({...file, props: { ...file.props, ...newFile.props }})
    editor.updateBlock(file.id, { props: { ...block.props, ...newFile.props }});
    editor.setTextCursorPosition(file.id, 'end');
  }

  return (
    <YStack
      borderWidth={0}
      outlineWidth={0}
    >
      {file.props.url ? (
        <FileComponent block={block} editor={editor} assign={assignFile} />
      ) : editor.isEditable ? (
        <FileForm block={block} assign={assignFile} />
      ) : (
        <></>
      )}
    </YStack>
  )
}

function FileComponent({block, editor, assign}: {block: Block<HDBlockSchema>, editor: BlockNoteEditor<HDBlockSchema>, assign: any}) {
  const [replace, setReplace] = useState(false)
  const [selected, setSelected] = useState(false)
  const tiptapEditor = editor._tiptapEditor
  const selection = tiptapEditor.state.selection

  useEffect(() => {
    const selectedNode = getBlockInfoFromPos(
      tiptapEditor.state.doc,
      tiptapEditor.state.selection.from,
    )
    if (selectedNode && selectedNode.id) {
      if (
        selectedNode.id === block.id &&
        selectedNode.startPos === selection.$anchor.pos
      ) {
        setSelected(true)
      } else if (selectedNode.id !== block.id) {
        setSelected(false)
      }
    }
  }, [selection])

  const saveFile = async () => {
    const client = await getClient()
    const data = (
      await client.get(
        `http://localhost:55001/ipfs/${block.props.url}`,
        {
          responseType: ResponseType.Binary,
        },
      )
    ).data as any

    const filePath = await save({
      defaultPath: (await appDataDir()) + '/' + block.props.name,
    })

    if (filePath) {
      try {
        await writeBinaryFile(filePath ? filePath : 'mintter-file', data, {
          dir: BaseDirectory.AppData,
        })
        toast.success(`Successfully downloaded file ${block.props.name}`)
      } catch (e) {
        toast.error(`Failed to download file ${block.props.name}`)
        console.log(e)
      }
    }
  }

  return (
    <div className={selected ? 'ProseMirror-selectednode' : ''}>
      <YStack
        // @ts-ignore
        contentEditable={false}
        className={block.type}
        onHoverIn={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
          setReplace(true)
        }}
        onHoverOut={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
          setReplace(false)
        }}
        borderWidth={0}
        outlineWidth={0}
        outlineColor="transparent"
        borderColor="transparent"
      >
        {replace ? (
          <Button
            theme="gray"
            position="absolute"
            top="$1.5"
            right="$1.5"
            zIndex="$4"
            size="$1"
            width={60}
            color="muted"
            onPress={() =>
              assign({
                // size: 0,
                props: {
                  url: '',
                  name: "",
                },
                children: [],
                content: [],
                type: 'file',
              } as FileType)}
          >
            replace
          </Button>
        ) : null}
        {!editor.isEditable ? (
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
          icon={RiFile2Line}
          disabled
        >
          {block.props.name}
        </Button>
      </YStack>
    </div>
  )
}

function FileForm({block, assign}: {block: Block<HDBlockSchema>, assign: any}) {
  const [url, setUrl] = useState('');
  const [tabState, setTabState] = useState('upload')
  const [fileName, setFileName] = useState<{name: string; color: string}>({
    name: 'Upload File',
    color: 'black',
  })

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const uploadedFile = event.target.files[0]
      if (uploadedFile && uploadedFile.size <= 62914560) {
        const {name} = uploadedFile
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
          assign({props: { url: data, name: name }} as FileType)
        } catch (error) {
          console.error(error)
        }
      } else setFileName({name: 'The file size exceeds 60 MB', color: 'red'})
    }
  }
  
  return (
    <div>
      <YStack
        //@ts-ignore
        contentEditable={false}
        position="relative"
        borderColor="transparent"
        outlineColor="transparent"
        borderWidth={0}
        outlineWidth={0}
      >
        <Popover
          placement="bottom"
          size="$5"
          defaultOpen={boolRegex.test(block.props.defaultOpen)}
          stayInFrame
        >
          <Popover.Trigger asChild>
            <Button
              icon={RiFile2Line}
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
            enterStyle={{ x: 0, y: -1, opacity: 0 }}
            exitStyle={{ x: 0, y: -1, opacity: 0 }}
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
                  <SizableText size="$2" color="black">
                    Embed Link
                  </SizableText>
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
                      onChange={handleUpload} />
                  </XStack>
                </XStack>
              </Tabs.Content>
              {/* <Tabs.Content value="embed">
                <XStack padding="$4" alignItems="center" backgroundColor="white">
                  <Form
                    alignItems="center"
                    onSubmit={() => submitFile(url)}
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
                        placeholder="Add an File URL"
                        focusStyle={{
                          borderColor: 'lightgrey',
                          outlineWidth: 0,
                          cursor: 'pointer',
                        }}
                        onChange={(e) => setUrl(e.nativeEvent.text)} />
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
              </Tabs.Content> */}
            </Tabs>
          </Popover.Content>
        </Popover>
      </YStack>
    </div>
  )
}

export const insertFile = new ReactSlashMenuItem<HDBlockSchema>(
"File",
(editor: BlockNoteEditor<HDBlockSchema>) => {
  insertOrUpdateBlock(editor, {
    type: 'file',
    props: {
      url: ''
    }
  })
},
["file", "folder"],
"Media",
<RiFile2Line size={18} />,
"Insert a File"
);