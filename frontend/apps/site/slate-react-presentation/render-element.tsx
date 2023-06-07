import {
  Code,
  Embed,
  Image as ImageType,
  Link,
  MttastNode,
  Video as VideoType,
  FlowContent,
} from '@mintter/shared'
import {useCallback, ReactNode, ComponentProps, useState} from 'react'
import {RenderElementProps} from 'slate-react'
import {
  Button,
  Copy,
  Tooltip,
  YStack,
  Paragraph as UIParagrah,
  TooltipGroup,
  config,
  SizableText,
} from '@mintter/ui'
import Image from 'next/image'
import {ElementLink} from './link'
import {Paragraph} from './paragraph'
import {StaticParagraph} from './static-paragraph'
import {Transclusion} from './transclusion'
import {Video} from './video'
import toast from 'react-hot-toast'
import {useHighlightContext} from './highlight'
import {useHoverContext} from 'slate-react-presentation/hover'

const MEDIA_HOSTNAME =
  process.env.NODE_ENV == 'development' ? process.env.NEXT_PUBLIC_GRPC_HOST : ''

export function useRenderElement() {
  return useCallback(({children, element}: RenderElementProps) => {
    const id: string = element.id
    switch ((element as MttastNode).type) {
      case 'group':
      case 'unorderedList':
        return (
          <Group key={id} tag="ul" type={element.type}>
            {children}
          </Group>
        )
      case 'orderedList':
        return (
          <Group
            key={id}
            tag="ol"
            type={element.type}
            start={element.start || '1'}
          >
            {children}
          </Group>
        )
      case 'statement':
      case 'heading':
      case 'blockquote':
      case 'code':
        return (
          <Block
            key={id}
            type={element.type}
            id={id}
            lang={element.type == 'code' ? element.lang : undefined}
          >
            {children}
          </Block>
        )
      case 'paragraph':
        return (
          <Paragraph key={id} element={element}>
            {children}
          </Paragraph>
        )
      case 'staticParagraph':
        return (
          <StaticParagraph key={id} element={element}>
            {children}
          </StaticParagraph>
        )
      case 'embed':
        return <Transclusion key={id} element={element as Embed} />
      case 'link':
        return <ElementLink key={id} element={element as Link} />
      case 'image':
        return (
          <div className="unset-img">
            <Image
              alt={(element as ImageType).alt}
              src={`${MEDIA_HOSTNAME}/ipfs/${(element as ImageType).url}`}
              layout="fill"
              className="image"
            />
          </div>
        )
      case 'video':
        return <Video key={id} element={element as VideoType} />
      // ...
      default:
        return (
          <Paragraph key={id} element={element}>
            {children}
          </Paragraph>
        )
    }
  }, [])
}

function Group({
  type,
  children,
  start,
  tag = 'ul',
}: {
  type: 'unorderedList' | 'orderedList' | 'group'
  children: ReactNode
  start?: number
  tag?: string
}) {
  return (
    <YStack
      margin={0}
      padding={0}
      marginLeft="-$4"
      gap="$2"
      // paddingLeft="$4"
      tag={tag}
      start={start}
      className={`group-type-${type}`}
    >
      {children}
    </YStack>
  )
}

function CopyBlockLinkButton({id}: {id: string}) {
  return (
    <TooltipGroup delay={{open: 2000, close: 100}}>
      <Tooltip placement="top-end">
        <Tooltip.Trigger position="absolute" right="$1" top="$1" zIndex={1000}>
          <Button
            size="$3"
            backgroundColor="$color1"
            onPress={() => {
              const {pathname, origin, search} = window.location
              navigator.clipboard.writeText(
                `${origin}${pathname}${search}#${id}`,
              )
              window.location.hash = id
              toast.success('Copied link to clipboard')
            }}
            icon={Copy}
          />
        </Tooltip.Trigger>
        <Tooltip.Content
          enterStyle={{x: 0, y: -5, opacity: 0, scale: 0.9}}
          exitStyle={{x: 0, y: -5, opacity: 0, scale: 0.9}}
          scale={1}
          x={0}
          y={0}
          opacity={1}
          paddingVertical="$1"
          paddingHorizontal="$3"
          animation={[
            'quick',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
        >
          <Tooltip.Arrow />
          <SizableText size="$2" lineHeight="$1">
            Copy Link to Block
          </SizableText>
        </Tooltip.Content>
      </Tooltip>
    </TooltipGroup>
  )
}

function Block({
  children,
  id,
  ...props
}: {
  children: ReactNode
} & ComponentProps<typeof YStack>) {
  const {hoveredId, setHoverId} = useHoverContext()
  const {highlightedId} = useHighlightContext()
  const isHighlighted = id == highlightedId
  const isHovered = id == hoveredId
  return (
    <YStack
      tag="li"
      {...props}
      className={`list-item`}
      borderRadius={6}
      key={id}
      id={id}
      // // animations not working for some reason..
      // enterStyle={isHighlighted ? {backgroundColor: '#0000FF'} : undefined}
      // animation={{
      //   backgroundColor: 'lazy',
      // }}
      backgroundColor={
        isHighlighted ? '$yellow5' : isHovered ? '$color5' : 'transparent'
      }
      onHoverIn={() => (id ? setHoverId(id) : undefined)}
      onHoverOut={() => setHoverId(null)}
    >
      {children}
      {isHovered && id ? <CopyBlockLinkButton id={id} /> : null}
    </YStack>
  )
}
