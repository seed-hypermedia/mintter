import {Editor, Transforms, Element as SlateElement, Point, Path} from 'slate'
// import copy from 'copy-to-clipboard';
// import { v4 } from 'uuid';
import React, {
  CSSProperties,
  MouseEvent,
  useContext,
  useMemo,
  useState,
} from 'react'
// import { ReactEditor, useSlate, useSlateStatic } from 'slate-react';
// import { CustomTypes as CustomElement } from './types';
// import { useScrollContext } from '../ScrollContext/ScrollContext';
import {useDragDrop, DndValues, DndHandlers} from './editor-node-props'
import {getNodeByCurrentPath, getNodePath, getNodeByPath} from './utils'
// import { useSettings } from '../SettingsContext/SettingsContext';

export type HoveredNode = Element | null

export type NodeSettingsContextValues = DndValues & {
  hoveredNode: HoveredNode
}

export type NodeSettingsContextHandlers = DndHandlers & {
  hoverIn: (_e: MouseEvent<HTMLDivElement>, _node: Element) => void
  hoverOut: (_e: MouseEvent<HTMLDivElement>, _node: Element) => void
  changeHoveredNode: (_hoveredProps: HoveredNode) => void
}

export type NodeSettingsContextType = [
  NodeSettingsContextValues,
  NodeSettingsContextHandlers,
]

const defaultValues: NodeSettingsContextValues = {
  hoveredNode: null,
  dndState: {fromPath: null, toPath: null},
  disableWhileDrag: false,
}

const NodeSettingsContext = React.createContext<NodeSettingsContextType>([
  defaultValues,
  {
    hoverIn: (_e: MouseEvent<HTMLDivElement>, _node: Element) => {
      //noop
    },
    hoverOut: (_e: MouseEvent<HTMLDivElement>, _node: Element) => {
      //noop
    },
    onDrop: (_e) => {
      //noop
    },
    onDragEnd: (_e) => {
      //noop
    },
    onDragEnter: (_e) => {
      //noop
    },
    onDragStart: (_e) => {
      //noop
    },
    changeHoveredNode: (_hoveredProps: HoveredNode) => {
      //noop
    },
  },
])

// We can get next nodes with sub paths [5, 0] | [5, 1] || [5, 2, 3];
const getRootLevelNextNodePath = (
  currentPath: Path,
  nextPoint: Point | undefined,
): Point => {
  if (!nextPoint) return {path: [currentPath[0] + 1], offset: 0}

  const rootNodePath = nextPoint.path[0]
  const subNodePath = nextPoint.path[1]

  if (typeof subNodePath === 'number' && subNodePath > 0) {
    return {path: [rootNodePath + 1, 0], offset: 0}
  }

  return {path: [rootNodePath, 0], offset: 0}
}

const getInitialState = ({children}: Editor): HoveredNode => {
  if (children.length === 1) {
    const node = children[0] as Element
    return node
  }

  return null
}

const NodeSettingsProvider = ({children}) => {
  const {editor} = children.props
  //   const { disableScroll, enableScroll } = useScrollContext();
  // const { options: libOptions } = useSettings();
  const [dragValues, dragHandlers] = useDragDrop(editor)

  const [hoveredNode, setHoveredNode] = useState<HoveredNode>(() =>
    getInitialState(editor),
  )

  const values: NodeSettingsContextValues = {
    hoveredNode,
    ...dragValues,
  }

  const handlers = useMemo<NodeSettingsContextHandlers>(
    () => ({
      hoverIn: (e: MouseEvent<HTMLDivElement>, node: Element) => {
        setHoveredNode(node)
      },

      hoverOut: (e: MouseEvent<HTMLDivElement>, node: Element) => {
        if (node.id === hoveredNode?.id) return e.preventDefault()
        setHoveredNode(null)
      },

      changeHoveredNode: (hoverProps: HoveredNode) =>
        setHoveredNode(hoverProps),

      ...dragHandlers,
    }),
    [hoveredNode, dragHandlers],
  )

  const contextValue = [values, handlers] as NodeSettingsContextType

  return (
    <NodeSettingsContext.Provider value={contextValue}>
      {children}
    </NodeSettingsContext.Provider>
  )
}

const useNodeSettingsContext = () =>
  useContext<NodeSettingsContextType>(NodeSettingsContext)

export {NodeSettingsProvider, useNodeSettingsContext}
