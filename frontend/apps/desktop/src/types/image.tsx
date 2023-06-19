import { Block, BlockNoteEditor, DefaultBlockSchema, defaultProps } from "@app/blocknote-core";
import { createReactBlockSpec, InlineContent, ReactSlashMenuItem } from "@app/blocknote-react";
import { hdBlockSchema } from '@app/client/schema';
import { Button, Form, Input, Label, Popover, SizableText, Tabs, XStack, YStack } from "@mintter/ui";
import { ChangeEvent, useEffect, useState } from "react";
import { RiImage2Fill } from "react-icons/ri";

export const ImageBlock = createReactBlockSpec({
    type: "image",
    propSchema: {
      ...defaultProps,
      url: {
        default: "",
      },
      alt: {
        default: "",
      },
      defaultOpen: {
        values: ["false", "true"],
        default: "true",
      },
    },
    containsInlineContent: true,
    // @ts-ignore
    render: ({ block, editor }: {block: Block<typeof hdBlockSchema>, editor: BlockNoteEditor<typeof hdBlockSchema>}) => (
      Render(block, editor)
    ),
  });

type ImageProps = {
  id: string,
  url: string,
  alt: string,
  children: [],
  content: [],
  type: string,
  defaultOpen: boolean,
}

const boolRegex = new RegExp("true");

const Render = (block: Block<typeof hdBlockSchema>, editor: BlockNoteEditor<typeof hdBlockSchema>) => {
  const [image, setImage] = useState<ImageProps>({
    // name: undefined,
    // size: 0,
    id: block.id,
    url: block.props.url,
    alt: block.props.alt,
    children: [],
    content: block.content,
    type: block.type,
    defaultOpen: boolRegex.test(block.props.defaultOpen),
  } as ImageProps)

  useEffect(() => {
    if (block.props.url && !image.url) {
      // block.name
      //   ? setImage({
      //       ...image,
      //       url: block.props.url,
      //     })
        // : 
      setImage({...image, url: block.props.url})
    }
    editor.setTextCursorPosition(block.id, 'end');
  }, [])

  const assignFile = (newImageProps: ImageProps) => {
    setImage({...image, ...newImageProps})
    editor.updateBlock(image.id, { props: { url: newImageProps.url, alt: newImageProps.alt }});
    editor.setTextCursorPosition(image.id, 'end');
  }

  if (image.defaultOpen)
    editor.updateBlock(image.id, { props: { defaultOpen: "false" } })

  return (
    <YStack
      borderWidth={0}
      outlineWidth={0}
    >
      {image.url ? (
        <ImageComponent block={block} assign={assignFile} />
      ) : (
        <ImageForm block={block} assign={assignFile} />
      )}
    </YStack>
  )
}

function ImageComponent({block, assign}: {block: Block<typeof hdBlockSchema>, assign: any}) {
  const [replace, setReplace] = useState(false)

  return (
    <div>
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
                // name: undefined,
                // size: 0,
                url: '',
                alt: '',
                children: [],
                content: [],
                type: 'image',
              } as ImageProps)}
          >
            replace
          </Button>
        ) : null}
        <img src={`http://localhost:55001/ipfs/${block.props.url}`} contentEditable={false} />
        {/* <XStack>
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
            // value={element.alt}
            // onChange={() => [console.log('CHANGE CAPTION', element)]}
            // onChangeText={(val: string) => {
            //   console.log('CHANGE CAPTION', val)
            //   send({type: 'CAPTION.UPDATE', value: val})
            // }}
            // onKeyPress={onKeyPress}
            // disabled={editor.mode != EditorMode.Draft}
          />
        </XStack> */}
      </YStack>
      <InlineContent />
    </div>
  )
}

function ImageForm({block, assign}: {block: Block<typeof hdBlockSchema>, assign: any}) {
  const [url, setUrl] = useState('');

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
          assign({ url: data } as ImageProps)
        } catch (error) {
          console.error(error)
        }
      } else setFileName({name: 'The file size exceeds 60 MB', color: 'red'})
    }
  }
  const [tabState, setTabState] = useState('upload')
  const [fileName, setFileName] = useState<{name: string; color: string}>({
    name: 'Upload File',
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
          assign({url: data} as ImageProps)
        } catch (error) {
          console.error(error)
        }
      } else setFileName({name: 'The file size exceeds 60 MB', color: 'red'})
    }
  }

  const isValidUrl = (urlString: string) => {
    try {
      return Boolean(new URL(urlString))
    } catch (e) {
      console.log(e)
      return false
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
              // icon={FileIcon}
              theme="gray"
              borderRadius={0}
              size="$5"
              justifyContent="flex-start"
            >
              Add an Image
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
                      onChange={handleUpload} />
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
              </Tabs.Content>
            </Tabs>
          </Popover.Content>
        </Popover>
      </YStack>
      <InlineContent />
    </div>
  )
}

export const insertImage = new ReactSlashMenuItem<
DefaultBlockSchema & { image: typeof ImageBlock }
>(
"Image",
// @ts-ignore
(editor: BlockNoteEditor<typeof hdBlockSchema>) => {
  editor.replaceBlocks(
    [editor.getTextCursorPosition().block.id],
    [
      {
        type: "image",
        props: {
          url: "",
          alt: "",
        },
      },
    ]
  );
},
["image", "img", "picture", "media"],
"Media",
<RiImage2Fill />,
"Insert an image"
);