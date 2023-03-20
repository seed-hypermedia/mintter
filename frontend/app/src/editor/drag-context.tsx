import { useDrag } from "@app/drag-context";
import { useMouse } from "@app/mouse-context";
import { FlowContent } from "@mintter/shared";
import React, { useState, createContext, useContext, useMemo, useEffect } from "react";
import {Editor, Element} from "slate"
import { useSlate } from "slate-react";

export type HoveredNode = FlowContent | null;

export type DragContextValues = {
  hoveredNode: FlowContent | null;
};

export type DragContextHandlers = {
  hoverIn: (_node: FlowContent) => void;
  hoverOut: (_node: FlowContent) => void;
}

export type DragContextType = [DragContextValues, DragContextHandlers]

const DragContext = createContext<DragContextType>([
  {hoveredNode: null},
  {
    hoverIn: (_node: FlowContent) => {},
    hoverOut: (_node: FlowContent) => {},
  }
])

const getInitialState = ({ children }: Editor): HoveredNode => {
  if (children.length === 1) {
    const node = children[0] as FlowContent;
    return node;
  }

  return null;
};

const DragContextProvider = ({ children }) => {
  // const editor = useSlate();
  const dragService = useDrag();
  const mouseService = useMouse();
  let [hoveredNode, setHoveredNode] = useState<HoveredNode>(null);

  let values: DragContextValues = {
    hoveredNode,
  };

  const handlers = useMemo<DragContextHandlers>(
    () => ({
      hoverIn: (node: FlowContent) => {
        // if (hoveredNode) return e.preventDefault();
        // console.log('here', node)
        setHoveredNode(node);
      },

      hoverOut: (node: FlowContent) => {
        // console.log('out', node, hoveredNode)
        if (node.id !== hoveredNode?.id)
          setHoveredNode(null);
      },
    }),
    [hoveredNode],
  );

  // let contextValue: DragContextType = [values, handlers]

  // useEffect(() => {
  //   values = {hoveredNode},
  //   contextValue = [values, handlers]
  //   console.log(contextValue);
  // }, [hoveredNode, dragService?.getSnapshot().context])

  const contextValue = useMemo<DragContextType>(
    () => {console.log(mouseService.getSnapshot()._event); return [values, handlers]},
    [dragService?.getSnapshot().context, mouseService.getSnapshot()._event],
  );

  // const contextValue: DragContextType = [values, handlers]

  return <DragContext.Provider value={contextValue}>{children}</DragContext.Provider>;
};

const useDragContext = () => useContext<DragContextType>(DragContext);
export { DragContextProvider, useDragContext };
