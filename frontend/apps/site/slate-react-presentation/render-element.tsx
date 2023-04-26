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
  Image,
  Tooltip,
  YStack,
  Paragraph as UIParagrah,
  TooltipGroup,
  config,
} from '@mintter/ui'
import {ElementLink} from './link'
import {Paragraph} from './paragraph'
import {StaticParagraph} from './static-paragraph'
import {Transclusion} from './transclusion'
import {Video} from './video'
import toast from 'react-hot-toast'
import {useHighlightContext} from './highlight'
import {useHoverContext} from 'slate-react-presentation/hover'

export function useRenderElement() {
  return useCallback(({children, element, attributes}: RenderElementProps) => {
    switch ((element as MttastNode).type) {
      case 'group':
      case 'unorderedList':
        return (
          <Group tag="ul" type={element.type}>
            {children}
          </Group>
        )
      case 'orderedList':
        return (
          <Group tag="ol" type={element.type} start={element.start || '1'}>
            {children}
          </Group>
        )
      case 'statement':
        return <Block id={element.id}>{children}</Block>
      case 'heading':
        return (
          <Block id={element.id} mb>
            {children}
          </Block>
        )
      case 'blockquote':
        return (
          <Block type={element.type} id={element.id}>
            {children}
          </Block>
        )
      case 'code':
        return (
          <Block id={element.id} lang={(element as Code).lang}>
            {children}
          </Block>
        )
      case 'paragraph':
        return <Paragraph element={element}>{children}</Paragraph>
      case 'staticParagraph':
        return <StaticParagraph element={element}>{children}</StaticParagraph>
      case 'embed':
        return <Transclusion element={element as Embed} />
      case 'link':
        return <ElementLink element={element as Link} />
      case 'image':
        return (
          <Image
            width="100%"
            height={400}
            src={(element as ImageType).url}
            alt={(element as ImageType).alt}
          />
        )
      case 'video':
        return <Video element={element as VideoType} />
      // ...
      default:
        return <Paragraph element={element}>{children}</Paragraph>
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
      paddingLeft="$4"
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
    <TooltipGroup delay={{open: 3000, close: 100}}>
      <Tooltip placement="top">
        <Tooltip.Trigger position="absolute" right={'$1'} top={'$1'}>
          <Button
            size="$2"
            backgroundColor={'$gray1'}
            onPress={() => {
              const {pathname, origin, search} = window.location
              navigator.clipboard.writeText(
                `${origin}${pathname}${search}#${id}`,
              )
              toast.success('Copied link to clipboard')
            }}
          >
            <Copy size="$1" />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content
          enterStyle={{x: 0, y: -5, opacity: 0, scale: 0.9}}
          exitStyle={{x: 0, y: -5, opacity: 0, scale: 0.9}}
          scale={1}
          x={0}
          y={0}
          opacity={1}
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
          <UIParagrah size="$2" lineHeight="$1">
            Copy Link to Block
          </UIParagrah>
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
      marginVertical="$2"
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
