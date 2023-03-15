import React from 'react'
import {isParent, MttastContent} from '@mintter/shared'
import {Article, Paragraph} from 'tamagui'
import {
  RenderElementProps as SlateRenderElementProps,
  RenderLeafProps as SlateRenderLeafProps,
} from 'slate-react'
import {useRenderElement} from './render-element'
import {useRenderLeaf} from './render-leaf'

type SlateReactPresentationProps = {
  value: [MttastContent] | []
  renderElement: ReturnType<typeof useRenderElement>
  renderLeaf: ReturnType<typeof useRenderLeaf>
  leafWrapper?: string
  type?: EditorType
}

export function SlateReactPresentation({
  value = [],
  renderElement = (props: RenderElementProps) => <DefaultElement {...props} />,
  renderLeaf = (props: RenderLeafProps) => <DefaultLeaf {...props} />,
  leafWrapper = 'span',
  type = 'publication' as EditorType,
}: SlateReactPresentationProps) {
  const [showChild, setShowChild] = React.useState(false)

  React.useEffect(() => {
    setShowChild(true)
  }, [])

  if (!showChild) return null

  let editor = (
    <SlatePresentationContext.Provider
      value={{renderElement, renderLeaf, leafWrapper, type}}
    >
      <Children childs={value} />
    </SlatePresentationContext.Provider>
  )

  if (type == 'transclusion') {
    return <>{editor}</>
  }

  return <Article className="editor">{editor}</Article>
}

export type EditorType = 'publication' | 'transclusion'

type RenderElementProps = Omit<SlateRenderElementProps, 'attributes'>
type RenderLeafProps = Omit<SlateRenderLeafProps, 'attributes'>

const SlatePresentationContext = React.createContext<{
  renderElement?: (props: RenderElementProps) => JSX.Element
  renderLeaf?: (props: RenderLeafProps) => JSX.Element
  leafWrapper?: string
  type?: EditorType
}>({})

export function useSlatePresentation() {
  return React.useContext(SlatePresentationContext)
}

function Children({childs = []}) {
  return (
    <React.Fragment>
      {childs.map((child, i) => {
        if (isParent(child)) {
          return <Element key={i} element={child} />
        } else {
          return <Leaf key={i} leaf={child} />
        }
      })}
    </React.Fragment>
  )
}

function Element({element = {children: []}}) {
  const {renderElement} = useSlatePresentation()

  return (
    <React.Fragment>
      {renderElement?.({
        children: <Children childs={element.children} />,
        element,
      })}
    </React.Fragment>
  )
}

export function Leaf({leaf = {text: ''}}) {
  const {renderLeaf, leafWrapper = 'span'} = useSlatePresentation()

  let ChildrenLeaf = leafWrapper || 'span'

  return (
    <React.Fragment>
      {renderLeaf?.({
        attributes: {},
        children: <>{leaf.text}</>,
        leaf,
        text: leaf.text,
      })}
    </React.Fragment>
  )
}

function DefaultElement({children, element}: RenderElementProps) {
  return <Paragraph>{children}</Paragraph>
}
function DefaultLeaf({children, leaf}) {
  return <span>{children}</span>
}
