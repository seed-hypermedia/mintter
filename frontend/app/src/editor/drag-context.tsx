import { FlowContent } from '@mintter/shared';
import React, { createContext, useState } from 'react'
import { Node } from 'slate';
import { RenderElementProps } from 'slate-react';
import { ElementDrag } from './drag-section';

export type HoveredNode = FlowContent | null;

export type DragContextValues = {
  drag: HoveredNode,
  setDrag: (_e: DragEvent, _node: FlowContent) => void,
  clearDrag: () => void,
}

// const CreateDragContext = () => {
//   const [draggedNode, setDraggedNode] = useState(null as HoveredNode);

//   const values = {
//     drag: draggedNode,
//     setDrag: (e: DragEvent, node: FlowContent) => {
//       if (draggedNode && node.id === draggedNode.id) return;
//       setDraggedNode(node);
//     }
//   }

//   const contextValue = createContext<DragContextValues>(values);
// }

const DragContext = createContext<DragContextValues>({drag: null, setDrag: () => {return null}, clearDrag: () => {return null}});
export default DragContext;
