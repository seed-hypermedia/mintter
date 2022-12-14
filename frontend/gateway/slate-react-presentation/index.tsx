import React, {PropsWithChildren, useContext} from 'react'
import {isText, isPhrasingContent, isParent} from '../mttast'
import {RenderElementProps, RenderLeafProps} from 'slate-react'

const SlatePresentationContext = React.createContext<{renderElement: (props: RenderElementProps) => JSX.Element; renderLeaf: (props: RenderLeafProps) => JSX.Element; LeafWrapper: string}>(null)

function useSlatePresentation() {
  return React.useContext(SlatePresentationContext)
}

function Element({element = {children: []}}) {
  const {renderElement} = useSlatePresentation()

  return (
    <React.Fragment>
      {renderElement({
        attributes: {},
        children: <Children children={element.children} />,
        element,
      })}
    </React.Fragment>
  )
}

function Leaf({leaf = {text: ''}}) {
  const {renderLeaf, LeafWrapper} = useSlatePresentation()

  return (
    <React.Fragment>
      {renderLeaf({
        attributes: {},
        children: <LeafWrapper>{leaf.text}</LeafWrapper>,
        leaf,
        text: leaf.text,
      })}
    </React.Fragment>
  )
}

function Children({children = []}) {
  return (
    <React.Fragment>
      {children.map((child, i) => {
        if (isParent(child)) {
          return <Element key={i} element={child} />
        } else {
          return <Leaf key={i} leaf={child} />
        }
      })}
    </React.Fragment>
  )
}

export function SlateReactPresentation({
  value = [],
  renderElement = (props: RenderElementProps) => <DefaultElement {...props} />,
  renderLeaf = (props: RenderLeafProps) => <DefaultLeaf {...props} />,
  LeafWrapper = 'span',
}) {
    console.log('SlateReactPresentation', value)
  return (
    <SlatePresentationContext.Provider
      value={{renderElement, renderLeaf, LeafWrapper}}
    >
      <Children children={value} />
    </SlatePresentationContext.Provider>
  )
}

function DefaultElement({children, element}: RenderElementProps) {
  return <div>{children}</div>
}
function DefaultLeaf({children, leaf}) {
  return <span>{children}</span>
}
