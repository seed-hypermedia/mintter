import { BACKEND_FILE_UPLOAD_URL, BACKEND_FILE_URL } from '@mintter/shared'
import {
  Button,
  Form,
  Input,
  Label,
  Popover,
  SizableText,
  Text,
  Tabs,
  XStack,
  YStack,
  useTheme,
  Card,
  H2,
  Paragraph,
  H1,
  Tooltip
} from '@mintter/ui'
import { ChangeEvent, PropsWithChildren, useEffect, useState } from 'react'
import { RiMessage2Fill, RiCheckFill, RiCloseCircleLine } from 'react-icons/ri'
import {
  Block,
  BlockNoteEditor,
  createReactBlockSpec,
  defaultProps,
  getBlockInfoFromPos,
} from './blocknote'
import { HMBlockSchema } from './schema'
import { Event as NostrEvent, validateEvent, verifySignature, nip21, nip19 } from 'nostr-tools'

export const NostrBlock = createReactBlockSpec({
  type: 'nostr',
  propSchema: {
    ...defaultProps,
    name: {
      default: '',
    },
    ref: {
      default: '',
    },
    defaultOpen: {
      values: ['false', 'true'],
      default: 'true',
    },
  },
  containsInlineContent: true,
  // @ts-ignore
  render: ({
    block,
    editor,
  }: {
    block: Block<HMBlockSchema>
    editor: BlockNoteEditor<HMBlockSchema>
  }) => Render(block, editor),
})

type NostrType = {
  id: string
  props: {
    name: string
    ref: string
  }
  children: []
  content: []
  type: string
}

const boolRegex = new RegExp('true')

const Render = (
  block: Block<HMBlockSchema>,
  editor: BlockNoteEditor<HMBlockSchema>,
) => {
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

  const assignNostr = (newNostr: NostrType) => {
    editor.updateBlock(block.id, {
      props: { ...block.props, ...newNostr.props },
      content: newNostr.content
    })
    editor.setTextCursorPosition(block.id, 'end')
  }

  const setSelection = (isSelected: boolean) => {
    setSelected(isSelected)
  }

  return (
    <YStack overflow="hidden">
      {block.props.name ? (
        <NostrComponent
          block={block}
          editor={editor}
          assign={assignNostr}
          selected={selected}
          setSelected={setSelection}
        />
      ) : editor.isEditable ? (
        <NostrForm block={block} editor={editor} assign={assignNostr} />
      ) : null}
    </YStack>
  )
}

function NostrComponent({
  block,
  editor,
  assign,
  selected,
  setSelected,
}: {
  block: Block<HMBlockSchema>
  editor: BlockNoteEditor<HMBlockSchema>
  assign: any
  selected: boolean
  setSelected: any
}) {
  const nostrNpud = nip19.npubEncode(block.props.name)

  const [replace, setReplace] = useState<boolean>(false)
  const [verified, setVerified] = useState<boolean>()
  const [content, setContent] = useState<string>()

  const uri = `nostr:${nostrNpud}`
  const header = `${block.props.name.slice(0, 6)}...${block.props.name.slice(-6)}`

  const event: NostrEvent = JSON.parse(block.props.ref ?? "{}")
  if (content === undefined) setContent(event.content)
  if (verified === undefined && validateEvent(event)) {
    setVerified(verifySignature(event))
  }

  return (
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
    >
      {replace && editor.isEditable ? (
        <Button
          position="absolute"
          top="$1.5"
          right="$1.5"
          zIndex="$4"
          size="$1"
          width={60}
          onPress={() =>
            assign({
              props: {
                name: '',
                ref: ''
              },
              children: [],
              content: [],
              type: 'nostr',
            } as NostrType)
          }
          hoverStyle={{
            backgroundColor: '$backgroundTransparent',
          }}
        >
          replace
        </Button>
      ) : null}
      <XStack>
        <Card
          elevate
          size="$4"
          bordered
          animation="bouncy"
          flex={1}
        >
          <Card.Header padded>
            <H2 marginTop={12}>
              <XStack justifyContent='space-between'>
                <Text>
                  {"Public Key: "}
                  {nip21.test(uri) ? (
                    <a href={uri}>
                      {header}
                    </a>
                  ) : (
                    { header }
                  )}
                </Text>
                <Tooltip content={verified ? "Signature verified" : "Invalid signature"}>
                  <Button
                    size="$2"
                    theme={verified ? "green" : "orange"}
                    icon={verified ? RiCheckFill : RiCloseCircleLine}
                  />
                </Tooltip>
              </XStack>
            </H2>
            <Paragraph theme="alt2" marginTop={12}>
              {content}
            </Paragraph>
          </Card.Header>
        </Card>
      </XStack>
    </YStack>
  )
}

function NostrForm({
  block,
  assign,
  editor,
}: {
  block: Block<HMBlockSchema>
  assign: any
  editor: BlockNoteEditor<HMBlockSchema>
}) {
  const [nostr, setNostr] = useState('')
  const [tabState, setTabState] = useState('manual')
  const [state, setState] = useState<{
    name: string | undefined
    color: string | undefined
  }>({
    name: undefined,
    color: undefined,
  })
  const theme = useTheme()

  const submitNote = async () => {
    const event: NostrEvent = JSON.parse(nostr)
    if (isValidEvent(event)) {
      setState({ name: undefined, color: undefined })
      assign({
        props: { name: event.pubkey, ref: nostr }
      })
    } else {
      setState({ name: 'The provided note is invalid or not supported.', color: 'red' })
    }
  }

  const isValidEvent = (event: NostrEvent) => {
    try {
      return validateEvent(event) && event.kind === 1 && verifySignature(event)
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
              icon={<RiMessage2Fill fill={theme.color12.get()} />}
              borderRadius={0}
              size="$5"
              justifyContent="flex-start"
            >
              Add a nostr note
            </Button>
          </Popover.Trigger>
          <Popover.Content
            padding={0}
            elevation="$3"
            overflow="hidden"
            size="$5"
            borderRadius="$5"
            shadowColor="$shadowColor"
            opacity={1}
            enterStyle={{ x: 0, y: -10, opacity: 0 }}
            exitStyle={{ x: 0, y: -10, opacity: 0 }}
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
              onValueChange={(value: string) => {
                setState({
                  name: undefined,
                  color: undefined,
                })
                setTabState(value)
              }}
              orientation="horizontal"
              flexDirection="column"
              width={500}
            >
              <Tabs.List
                marginBottom="$-0.5"
                backgroundColor="$background"
                borderBottomColor="$color8"
                borderBottomWidth="$1"
                borderBottomLeftRadius={0}
                borderBottomRightRadius={0}
                borderRadius={0}
              >
                <Tabs.Tab
                  unstyled
                  value="manual"
                  paddingHorizontal="$4"
                  paddingVertical="$2"
                  borderBottomLeftRadius={0}
                  borderBottomRightRadius={0}
                  borderBottomWidth={tabState == 'manual' ? '$1' : '$0'}
                  hoverStyle={{
                    backgroundColor: '$borderColorHover',
                    cursor: 'pointer',
                  }}
                >
                  <SizableText size="$2">Manual</SizableText>
                </Tabs.Tab>
              </Tabs.List>
              <Tabs.Content value="manual">
                <XStack
                  padding="$4"
                  alignItems="center"
                  backgroundColor="$background"
                >
                  <Form
                    alignItems="center"
                    onSubmit={() => submitNote()}
                    borderWidth={0}
                  >
                    <YStack flex={1}>
                      <XStack>
                        <Input
                          width={360}
                          marginRight="$3"
                          borderColor="$color8"
                          borderWidth="$0.5"
                          borderRadius="$3"
                          size="$3.5"
                          placeholder="Input nostr note"
                          focusStyle={{
                            borderColor: '$colorFocus',
                            outlineWidth: 0,
                          }}
                          hoverStyle={{
                            borderColor: '$colorFocus',
                            outlineWidth: 0,
                          }}
                          onChange={(e) => setNostr(e.nativeEvent.text)}
                        />
                        <Form.Trigger asChild>
                          <Button
                            flex={0}
                            flexShrink={0}
                            borderRadius="$3"
                            size="$3.5"
                            theme={'green'}
                            focusStyle={{
                              outlineWidth: 0,
                            }}
                          >
                            Embed
                          </Button>
                        </Form.Trigger>
                      </XStack>
                      {state.name && (
                        <SizableText
                          size="$2"
                          color={state.color}
                          paddingTop="$2"
                        >
                          {state.name}
                        </SizableText>
                      )}
                    </YStack>
                  </Form>
                </XStack>
              </Tabs.Content>
            </Tabs>
          </Popover.Content>
        </Popover>
      </YStack>
    </div>
  )
}
