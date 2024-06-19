import {API_FILE_UPLOAD_URL} from '@shm/shared'
import {Button, Text, XStack, YStack, toast} from '@shm/ui'
import {useState} from 'react'
import {Block, HMBlockSchema, MaxFileSizeB, MaxFileSizeMB} from '.'
import {BlockNoteEditor} from './blocknote'
import {InlineContent} from './blocknote/react/ReactBlockSpec'
import {MediaType} from './media-render'

interface ContainerProps {
  editor: BlockNoteEditor<HMBlockSchema>
  block: Block<HMBlockSchema>
  mediaType: string
  styleProps?: Object
  selected: boolean
  setSelected: any
  assign: any
  children: any
  onHoverIn?: () => void
  onHoverOut?: (e: any) => void
  width?: number | string
  className?: string
  onPress?: (e: Event) => void
}

export const MediaContainer = ({
  editor,
  block,
  mediaType,
  styleProps,
  selected,
  setSelected,
  assign,
  children,
  onHoverIn,
  onHoverOut,
  width = '100%',
  className,
  onPress,
}: ContainerProps) => {
  const [replace, setReplace] = useState(false)
  const [drag, setDrag] = useState(false)
  const isEmbed = ['embed', 'web-embed'].includes(mediaType)

  const handleDragReplace = async (file: File) => {
    if (file.size > MaxFileSizeB) {
      toast.error(`The size of ${file.name} exceeds ${MaxFileSizeMB} MB.`)
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(API_FILE_UPLOAD_URL, {
        method: 'POST',
        body: formData,
      })
      const data = await response.text()

      assign({
        props: {
          url: data ? `ipfs://${data}` : '',
          name: file.name,
          size: file.size.toString(),
        },
      } as MediaType)
    } catch (error) {
      console.error(
        `Editor: ${mediaType} upload error (MediaComponent): ${mediaType}: ${file.name} error: ${error}`,
      )
    }
  }

  const dragProps = {
    onDrop: (e: React.DragEvent<HTMLDivElement>) => {
      if (e.dataTransfer.effectAllowed === 'move') return
      e.preventDefault()
      e.stopPropagation()
      setDrag(false)
      if (selected) setSelected(false)
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = Array.from(e.dataTransfer.files)[0]
        if (!file.type.includes(`${mediaType}/`) && mediaType !== 'file') {
          toast.error(
            `The dragged file is not ${
              mediaType === 'image' ? 'an' : 'a'
            } ${mediaType}.`,
          )
          return
        }
        handleDragReplace(file)
        return
      }
    },
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setDrag(true)
    },
    onDragEnter: (e: React.DragEvent<HTMLDivElement>) => {
      const relatedTarget = e.relatedTarget as HTMLElement
      e.preventDefault()
      e.stopPropagation()
      setDrag(true)
      if (
        (!relatedTarget || !e.currentTarget.contains(relatedTarget)) &&
        e.dataTransfer.effectAllowed !== 'move'
      ) {
        setSelected(true)
      }
    },
    onDragLeave: (e: React.DragEvent<HTMLDivElement>) => {
      const relatedTarget = e.relatedTarget as HTMLElement
      e.preventDefault()
      e.stopPropagation()
      setDrag(false)
      if (
        (!relatedTarget || !e.currentTarget.contains(relatedTarget)) &&
        e.dataTransfer.effectAllowed !== 'move'
      ) {
        setSelected(false)
      }
    },
  }

  const mediaProps = {
    ...styleProps,
    ...(isEmbed ? {} : dragProps),
    onHoverIn: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (onHoverIn) onHoverIn()
      setReplace(true)
    },
    onHoverOut: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (onHoverOut) onHoverOut(e)
      setReplace(false)
    },
    outlineWidth: 0,
  }

  return (
    <YStack
      gap="$2"
      group="item"
      maxWidth="100%"
      width={width}
      alignSelf="center"
      onPress={
        onPress
          ? (e) => {
              e.preventDefault()
              e.stopPropagation()
              onPress(e)
            }
          : undefined
      }
    >
      {drag && !isEmbed ? (
        <XStack
          position="absolute"
          zIndex={100}
          fullscreen
          pointerEvents="none"
          alignItems="center"
          justifyContent="center"
        >
          <XStack
            paddingHorizontal="$4"
            paddingVertical="$2"
            backgroundColor="$backgroundColor"
            borderWidth={2}
            borderRadius="$2"
            borderColor={'$color8'}
          >
            <Text fontFamily="$mono" fontSize="$3" zIndex={2}>
              Drop to replace
            </Text>
          </XStack>
          <XStack
            opacity={0.75}
            backgroundColor="$backgroundHover"
            position="absolute"
            fullscreen
            zIndex={1}
          />
        </XStack>
      ) : null}
      <YStack
        backgroundColor={selected ? '$color4' : '$color3'}
        borderColor={selected ? '$color8' : 'transparent'}
        borderWidth={2}
        borderRadius="$2"
        // overflow="hidden"
        hoverStyle={{
          backgroundColor: '$color4',
        }}
        {...mediaProps}
        // @ts-ignore
        contentEditable={false}
        className={className ?? block.type}
        group="item"
      >
        {replace && mediaType !== 'embed'
          ? editor.isEditable && (
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
                      url: '',
                      name: '',
                      size: '0',
                      width:
                        mediaType === 'image'
                          ? editor.domElement.firstElementChild!.clientWidth
                          : undefined,
                    },
                    children: [],
                    content: [],
                    type: mediaType,
                  } as MediaType)
                }
                hoverStyle={{
                  backgroundColor: '$backgroundHover',
                }}
              >
                replace
              </Button>
            )
          : null}
        {children}
      </YStack>
      {mediaType === 'image' && <InlineContent className="image-caption" />}
    </YStack>
  )
}
