import {
  Code,
  Embed,
  Image as ImageType,
  Link,
  MttastNode,
  Video as VideoType,
  FlowContent,
} from '@mintter/shared'
import {useCallback, useRef, useMemo, ReactNode} from 'react'
import {RenderElementProps} from 'slate-react'
import {Image, styled, YStack} from 'tamagui'
import {ElementLink} from './link'
import {Paragraph} from './paragraph'
import {StaticParagraph} from './static-paragraph'
import {Transclusion} from './transclusion'
import {Video} from './video'

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

const StyledGroup = styled(YStack, {
  margin: 0,
  padding: 0,
  ml: '-$4',
  pl: '$4',
})

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
    <StyledGroup tag={tag} start={start} className={`group-type-${type}`}>
      {children}
    </StyledGroup>
  )
}

const StyledBlock = styled(YStack, {
  tag: 'li',
  my: '$2',
})

function Block({type, children, ...props}: {type: FlowContent['type']}) {
  return (
    <StyledBlock tag="li" {...props} className={`list-item`}>
      {children}
    </StyledBlock>
  )
}
