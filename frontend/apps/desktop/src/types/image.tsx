import { Button, Form, Input, Label, Popover, SizableText, Tabs, TextArea, XStack, YStack } from "@mintter/ui";
import { BlockNoteEditor, DefaultBlockSchema, defaultProps, SpecificBlock } from "@mtt-blocknote/core";
import { createReactBlockSpec, InlineContent, ReactSlashMenuItem } from "@mtt-blocknote/react";
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
      }
    },
    containsInlineContent: true,
    render: ({ block, editor }: {block: any, editor: any}) => (
      Render(block, editor)
    ),

  //   type: "image",
  // propSchema: {
  //   src: {
  //     default: "https://via.placeholder.com/1000",
  //   },
  // },
  // containsInlineContent: true,
  // render: ({ block }) => (
  //   <div
  //     style={{
  //       display: "flex",
  //       flexDirection: "column",
  //     }}>
  //     <img
  //       style={{
  //         width: "100%",
  //       }}
  //       src={block.props.src}
  //       alt={"Image"}
  //       contentEditable={false}
  //     />
  //     <InlineContent />
  //   </div>
  // ),
  });

type ImageProps = {
  id: '',
  url: '',
  alt: '',
  children: [],
  type: 'image',
}

const Render = (block: any, editor: any) => {
  const [image, setImage] = useState<ImageProps>({
    // name: undefined,
    // size: 0,
    id: block.id,
    url: '',
    alt: '',
    children: [],
    type: block.type,
  } as ImageProps)

  useEffect(() => {
    if (block.props.url && !image.url) {
      block.name
        ? setImage({
            ...image,
            url: block.props.url,
          })
        : setImage({...image, url: block.props.url})
    }
    editor.setTextCursorPosition(block.id, 'end');
  }, [])

  const assignFile = (newImage: ImageProps) => {
    setImage({...image, ...newImage})
    editor.updateBlock(block.id, { props: { url: newImage.url }});
    editor.setTextCursorPosition(block.id, 'end');
  }

  // if ((element as FileType).defaultOpen)
  //   Transforms.setNodes<FileType>(editor, {defaultOpen: false}, {at: path})

  return (
    <YStack
      // {...attributes}
      // borderColor={selected && focused ? '#B4D5FF' : 'transparent'}
      borderWidth={0}
      outlineWidth={0}
    >
      {block.props.url ? (
        <ImageComponent block={block} />
      ) : (
        <ImageForm block={block} assign={assignFile} />
      )}
    </YStack>
  )
}

function ImageComponent({block}: any) {
  return (
    <div>
      <YStack
        // @ts-ignore
        contentEditable={false}
        className={block.type}
        // onHoverIn={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        //   setReplace(true)
        // }}
        // onHoverOut={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        //   setReplace(false)
        // }}
        borderWidth={0}
        outlineWidth={0}
        outlineColor="transparent"
        borderColor="transparent"
      >
        {/* {editor.mode == EditorMode.Draft && replace ? (
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
        ) : null} */}
        {/* <img src={`http://localhost:55001/ipfs/${(element as ImageType).url}`} /> */}
        <img src={`http://localhost:55001/ipfs/${block.props.url}`} contentEditable={false} />
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
            // value={element.alt}
            // onChange={() => [console.log('CHANGE CAPTION', element)]}
            // onChangeText={(val: string) => {
            //   console.log('CHANGE CAPTION', val)
            //   send({type: 'CAPTION.UPDATE', value: val})
            // }}
            // onKeyPress={onKeyPress}
            // disabled={editor.mode != EditorMode.Draft}
          />
        </XStack>  
      </YStack>
      <InlineContent />
    </div>
  )
}

function ImageForm({block, assign}: {block: any, assign: any}) {
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
        // borderColor={selected && focused ? '#B4D5FF' : 'transparent'}
        borderColor="transparent"
        outlineColor="transparent"
        borderWidth={0}
        outlineWidth={0}
      >
        <Popover
          placement="bottom"
          size="$5"
          // defaultOpen={element.defaultOpen}
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
(editor: any) => {
  editor.insertBlocks(
    [
      {
        type: "image",
        props: {
          url: "",
          alt: "",
        },
      },
    ],
    editor.getTextCursorPosition().block,
    "after"
  );
},
["image", "img", "picture", "media"],
"Media",
<RiImage2Fill />,
"Insert an image"
);