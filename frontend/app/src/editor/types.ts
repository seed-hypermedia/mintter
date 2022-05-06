import type { Document, Image, MttastContent, Text, Video } from '@mintter/mttast'
import React from 'react'
import type { BaseEditor, Editor, NodeEntry, Range } from 'slate'
import type { HistoryEditor } from 'slate-history'
import type { ReactEditor, RenderElementProps, RenderLeafProps } from 'slate-react'
import { EditorMode } from './plugin-utils'

declare module 'slate' {
  export interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor & { mode: EditorMode; readOnly: boolean }
    Element: Exclude<MttastContent, Document | Text | Video | Image>
    Text: Text
  }
}

export interface EditableEventHandlers {
  onDOMBeforeInput?: (event: InputEvent) => void
  // now come all the event handlers, this mirrors all supported react events right now
  // for a proper plugin system we will want to trim this list somewhat

  // Clipboard Events
  onCopy?: React.ClipboardEventHandler
  onCopyCapture?: React.ClipboardEventHandler
  onCut?: React.ClipboardEventHandler
  onCutCapture?: React.ClipboardEventHandler
  onPaste?: React.ClipboardEventHandler
  onPasteCapture?: React.ClipboardEventHandler

  // Composition Events
  onCompositionEnd?: React.CompositionEventHandler
  onCompositionEndCapture?: React.CompositionEventHandler
  onCompositionStart?: React.CompositionEventHandler
  onCompositionStartCapture?: React.CompositionEventHandler
  onCompositionUpdate?: React.CompositionEventHandler
  onCompositionUpdateCapture?: React.CompositionEventHandler

  // Focus Events
  onFocus?: React.FocusEventHandler
  onFocusCapture?: React.FocusEventHandler
  onBlur?: React.FocusEventHandler
  onBlurCapture?: React.FocusEventHandler

  // Keyboard Events
  onKeyDown?: React.KeyboardEventHandler
  onKeyDownCapture?: React.KeyboardEventHandler
  onKeyPress?: React.KeyboardEventHandler
  onKeyPressCapture?: React.KeyboardEventHandler
  onKeyUp?: React.KeyboardEventHandler
  onKeyUpCapture?: React.KeyboardEventHandler

  // MouseEvents
  onClick?: React.MouseEventHandler
  onClickCapture?: React.MouseEventHandler
  onContextMenu?: React.MouseEventHandler
  onContextMenuCapture?: React.MouseEventHandler
  onDblClick?: React.MouseEventHandler
  onDblClickCapture?: React.MouseEventHandler
  onDrag?: React.DragEventHandler
  onDragCapture?: React.DragEventHandler
  onDragEnd?: React.DragEventHandler
  onDragEndCapture?: React.DragEventHandler
  onDragEnter?: React.DragEventHandler
  onDragEnterCapture?: React.DragEventHandler
  onDragExit?: React.DragEventHandler
  onDragExitCapture?: React.DragEventHandler
  onDragLeave?: React.DragEventHandler
  onDragLeaveCapture?: React.DragEventHandler
  onDragOver?: React.DragEventHandler
  onDragOverCapture?: React.DragEventHandler
  onDragStart?: React.DragEventHandler
  onDragStartCapture?: React.DragEventHandler
  onDrop?: React.DragEventHandler
  onDropCapture?: React.DragEventHandler
  onMouseDown?: React.MouseEventHandler
  onMouseDownCapture?: React.MouseEventHandler
  onMouseEnter?: React.MouseEventHandler
  onMouseEnterCapture?: React.MouseEventHandler
  onMouseLeave?: React.MouseEventHandler
  onMouseLeaveCapture?: React.MouseEventHandler
  onMouseMove?: React.MouseEventHandler
  onMouseMoveCapture?: React.MouseEventHandler
  onMouseOut?: React.MouseEventHandler
  onMouseOutCapture?: React.MouseEventHandler
  onMouseOver?: React.MouseEventHandler
  onMouseOverCapture?: React.MouseEventHandler
  onMouseUp?: React.MouseEventHandler
  onMouseUpCapture?: React.MouseEventHandler

  // Selection Events
  onSelect?: React.EventHandler<React.SyntheticEvent>
  onSelectCapture?: React.EventHandler<React.SyntheticEvent>

  // Touch Events
  onTouchCancel?: React.TouchEventHandler
  onTouchCancelCapture?: React.TouchEventHandler
  onTouchEnd?: React.TouchEventHandler
  onTouchEndCapture?: React.TouchEventHandler
  onTouchMove?: React.TouchEventHandler
  onTouchMoveCapture?: React.TouchEventHandler
  onTouchStart?: React.TouchEventHandler
  onTouchStartCapture?: React.TouchEventHandler

  // Pointer Events
  onPointerOver?: React.PointerEventHandler
  onPointerOverCapture?: React.PointerEventHandler
  onPointerEnter?: React.PointerEventHandler
  onPointerEnterCapture?: React.PointerEventHandler
  onPointerDown?: React.PointerEventHandler
  onPointerDownCapture?: React.PointerEventHandler
  onPointerMove?: React.PointerEventHandler
  onPointerMoveCapture?: React.PointerEventHandler
  onPointerUp?: React.PointerEventHandler
  onPointerUpCapture?: React.PointerEventHandler
  onPointerCancel?: React.PointerEventHandler
  onPointerCancelCapture?: React.PointerEventHandler
  onPointerOut?: React.PointerEventHandler
  onPointerOutCapture?: React.PointerEventHandler
  onPointerLeave?: React.PointerEventHandler
  onPointerLeaveCapture?: React.PointerEventHandler
  onGotPointerCapture?: React.PointerEventHandler
  onGotPointerCaptureCapture?: React.PointerEventHandler
  onLostPointerCapture?: React.PointerEventHandler
  onLostPointerCaptureCapture?: React.PointerEventHandler

  // UI Events
  onScroll?: React.UIEventHandler
  onScrollCapture?: React.UIEventHandler

  // Wheel Events
  onWheel?: React.WheelEventHandler
  onWheelCapture?: React.WheelEventHandler

  // Animation Events
  onAnimationStart?: React.AnimationEventHandler
  onAnimationStartCapture?: React.AnimationEventHandler
  onAnimationEnd?: React.AnimationEventHandler
  onAnimationEndCapture?: React.AnimationEventHandler
  onAnimationIteration?: React.AnimationEventHandler
  onAnimationIterationCapture?: React.AnimationEventHandler

  // Transition Events
  onTransitionEnd?: React.TransitionEventHandler
  onTransitionEndCapture?: React.TransitionEventHandler
}

type EditorEventHandlers = {
  [key in keyof EditableEventHandlers]: (editor: Editor) => EditableEventHandlers[key] | undefined | void
}

export interface EditorPlugin extends EditorEventHandlers {
  /**
   * The name of the plugin, for use in error messages and warnings.
   */
  name: string
  /**
   * Conditionally apply the plugin based on the editors mode.
   * Can be a plain enum variant or a function that returns wether to the plugin should be applied.
   */
  apply?: EditorMode | ((mode: EditorMode) => boolean)
  /**
   * Configure the editor object before it's given to slate. Can be used to augment methods or add new fields.
   */
  configureEditor?: (editor: Editor) => Editor | undefined | void
  /**
   * Render a mttast element. The hook receives the editor object and `RenderElementProps`.
   * It can return a JSX element to be rendered on page.
   */
  renderElement?: (editor: Editor) => (props: RenderElementProps) => JSX.Element | undefined | void
  /**
   * Render a mttast leaf. The hook receives the editor object and `RenderLeafProps`.
   * It can return a JSX element to be rendered on page.
   */
  renderLeaf?: (editor: Editor) => (props: RenderLeafProps) => JSX.Element | undefined | void
  /**
   * Return decoration ranges. The hook receives the editor object and a `NodeEntry`.
   * It can return an array of ranges.
   */
  decorate?: (editor: Editor) => (node: NodeEntry) => Range[] | undefined | void
}
