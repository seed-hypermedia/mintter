import {Box} from '@components/box'
import {Button} from '@components/button'
import {Icon, icons} from '@components/icon'
import {forwardRef, useEffect, useRef} from 'react'
import {Editor, Range, Text, Transforms} from 'slate'
import {useFocused, useSlate} from 'slate-react'
import {MARK_EMPHASIS} from './emphasis'
import {MARK_STRONG} from './strong'
import {MARK_UNDERLINE} from './underline'

const toggleFormat = (editor: Editor, format: string): void => {
  if (!editor.selection) return

  const isActive = isFormatActive(editor, format)

  Transforms.setNodes(
    editor,
    {[format]: isActive ? null : true},
    {match: Text.isText, split: true, mode: 'highest'},
  )
}

const isFormatActive = (editor: Editor, format: string): boolean => {
  const [match] = Editor.nodes(editor, {
    match: (n) => !!n[format],
    mode: 'all',
  })

  return !!match
}

export function EditorHoveringToolbar() {
  const ref = useRef<HTMLDivElement | null>(null)

  const editor = useSlate()
  const inFocus = useFocused()

  useEffect(() => {
    const el = ref.current
    const {selection} = editor

    if (!el) {
      return
    }

    if (
      !selection ||
      !inFocus ||
      Range.isCollapsed(selection) ||
      Editor.string(editor, selection) === ''
    ) {
      el?.removeAttribute('style')
      return
    }

    const domSelection = window.getSelection()
    const domRange = domSelection?.getRangeAt(0)
    const rect = domRange?.getBoundingClientRect()

    if (!rect) {
      return
    }

    el.style.opacity = '1'
    el.style.top = `${rect.top + window.pageYOffset - el.offsetHeight - 110}px`
    el.style.left = `${
      rect.left + window.pageXOffset - el.offsetWidth / 2 + rect.width / 2
    }px`
  })

  return (
    <Menu
      ref={ref}
      onMouseDown={(e) => {
        // prevent toolbar from taking focus away from editor
        e.preventDefault()
      }}
    >
      <FormatButton format={MARK_STRONG} icon="Strong" />
      <FormatButton format={MARK_EMPHASIS} icon="Emphasis" />
      <FormatButton format={MARK_UNDERLINE} icon="Underline" />
    </Menu>
  )
}

const FormatButton = ({
  format,
  icon,
}: {
  format: string
  icon: keyof typeof icons
}) => {
  const editor = useSlate()

  return (
    <Button
      variant="ghost"
      size="0"
      color="muted"
      css={
        isFormatActive(editor, format)
          ? {
              backgroundColor: '$base-text-high',
              color: '$base-text-hight',
              '&:hover': {
                backgroundColor: '$base-text-high !important',
                color: '$base-text-hight !important',
              },
            }
          : {}
      }
      onClick={() => toggleFormat(editor, format)}
    >
      <Icon name={icon} size="2" />
    </Button>
  )
}

const Menu = forwardRef<HTMLDivElement, Record<string, any>>(
  ({children, ...props}, ref) => {
    return (
      <Box
        {...props}
        ref={ref}
        css={{
          boxShadow: '$menu',
          padding: '$2',
          position: 'absolute',
          zIndex: '$max',
          top: '-10000px',
          left: '-10000px',
          opacity: 0,
          backgroundColor: '$base-background-normal',
          borderRadius: '2px',
          transition: 'opacity 0.5s',
          display: 'flex',
          gap: '$2',
          paddingHorizontal: '$2',
          '& > *': {
            display: 'inline-block',
          },
          '& > * + *': {
            marginLeft: 2,
          },
        }}
      >
        {children}
      </Box>
    )
  },
)

// import {Box} from '@components/box'
// import {Button} from '@components/button'
// import {Icon, icons} from '@components/icon'
// import {Tooltip} from '@components/tooltip'
// import {offset, shift, useFloating} from '@floating-ui/react-dom'
// import {forwardRef, useEffect, useRef} from 'react'
// import {Editor, Range, Text, Transforms} from 'slate'
// import {useFocused, useSlate} from 'slate-react'
// // import {ToolbarLink} from './link'

// export function EditorHoveringToolbar() {
//   const ref = useRef<HTMLDivElement | null>()
//   const editor = useSlate()
//   const inFocus = useFocused()

//   const {x, y, reference, floating, strategy} = useFloating({
//     placement: 'top',
//     middleware: [offset(8), shift()],
//   })

//   useEffect(() => {
//     const el = ref.current
//     const {selection} = editor

//     if (!el) {
//       return
//     }

//     if (
//       !selection ||
//       !inFocus ||
//       Range.isCollapsed(selection) ||
//       Editor.string(editor, selection) === ''
//     ) {
//       el.removeAttribute('style')
//       return
//     }

//     const domSelection = window.getSelection()
//     const domRange = domSelection?.getRangeAt(0)
//     // const rect = domRange?.getBoundingClientRect()

//     if (domRange) {
//       reference(domRange)
//     }

//     // console.log('update toolbar position')

//     // el.style.opacity = '1'
//     // el.style.top = `${rect.top + window.pageYOffset - el.offsetHeight}px`
//     // el.style.left = `${
//     //   rect.left + window.pageXOffset - el.offsetWidth / 2 + rect.width / 2
//     // }px`
//   })

//   return (
//     <Menu
//       ref={floating}
//       style={{
//         position: strategy,
//         top: y ?? 0,
//         left: x ?? 0,
//       }}
//     >
//       <FormatButton name="Strong" format="strong" />
//       <FormatButton name="Emphasis" format="emphasis" />
//       <FormatButton name="Underline" format="underline" />
//       <FormatButton name="Code" format="code" />
//       {/* <ToolbarLink
//         editor={editor}
//         lastSelection={lastSelection}
//         resetSelection={resetSelection}
//         sendStoreFocus={sendStoreFocus}
//       />
//       <Tooltip content={<span>Image</span>}>
//         <Button
//           onClick={insertImageHandler(editor)}
//           variant="ghost"
//           size="0"
//           color="muted"
//         >
//           <Icon name="Image" size="2" />
//         </Button>
//       </Tooltip> */}
//     </Menu>
//   )

//   //   return (
//   //     <Menu

//   //     >
//   //       {/* <ToggleListButton type="orderedList" />
//   //         <ToggleListButton type="unorderedList" /> */}
//   //     </Menu>
//   //   )
// }

// // import {Box} from '@components/box'
// // import {Button} from '@components/button'
// // import {offset, shift, useFloating} from '@floating-ui/react-dom'
// // import {image, Text as MTTText, text} from '@mintter/mttast'
// // import {
// //   forwardRef,
// //   MouseEvent,
// //   useEffect,
// //   useLayoutEffect,
// //   useState,
// // } from 'react'
// // import {BaseSelection, Editor, Range, Transforms} from 'slate'
// // import {ReactEditor, useSlateStatic} from 'slate-react'
// //
// // import {isMarkActive, toggleMark} from './utils'

// // type FormatTypes = keyof Omit<
// //   MTTText,
// //   'type' | 'text' | 'value' | 'data' | 'position'
// // >

// const toggleFormat = (editor: Editor, format: string) => {
//   const isActive = isFormatActive(editor, format)
//   Transforms.setNodes(
//     editor,
//     {[format]: isActive ? null : true},
//     {match: Text.isText, split: true},
//   )
// }

// const isFormatActive = (editor: Editor, format: string) => {
//   const [match] = Editor.nodes(editor, {
//     match: (n) => n[format] === true,
//     mode: 'all',
//   })
//   return !!match
// }

// function FormatButton({
//   name,
//   format,
// }: {
//   format: string
//   name: keyof typeof icons
// }) {
//   const editor = useSlate()
//   const markActive = isFormatActive(editor, format)

//   return (
//     <Tooltip content={<span>{format}</span>}>
//       <Button
//         css={
//           markActive
//             ? {
//                 backgroundColor: '$base-text-high',
//                 color: '$base-text-hight',
//                 '&:hover': {
//                   backgroundColor: '$base-text-high !important',
//                   color: '$base-text-hight !important',
//                 },
//               }
//             : {}
//         }
//         onMouseDown={(event) => {
//           event.preventDefault()
//           toggleFormat(editor, format)
//         }}
//         variant="ghost"
//         size="0"
//         color="muted"
//       >
//         <Icon name={name} size="2" />
//       </Button>
//     </Tooltip>
//   )
// }

// const Menu = forwardRef<HTMLDivElement, Record<string, any>>(
//   ({children, ...props}, ref) => (
//     <Box
//       {...props}
//       ref={ref}
//       className="dark-theme"
//       css={{
//         padding: '$2',
//         position: 'absolute',
//         zIndex: '$max',
//         top: '-10000px',
//         left: '-10000px',
//         marginTop: '-6px',
//         opacity: 0,
//         backgroundColor: '$base-background-normal',
//         borderRadius: '2px',
//         transition: 'opacity 0.5s',
//         // boxShadow: '$menu',
//         // display: 'flex',
//         // gap: '$2',
//         // paddingHorizontal: '$2',
//         // '& > *': {
//         //   display: 'inline-block',
//         // },
//         // '& > * + *': {
//         //   marginLeft: 2,
//         // },
//       }}
//     >
//       {children}
//     </Box>
//   ),
// )

// Menu.displayName = 'Menu'

// // export interface UseLastSelectionResult {
// //   lastSelection: Range | null
// //   resetSelection: () => void
// // }

// // const defaultVirtualEl = {
// //   getBoundingClientRect() {
// //     return {
// //       x: 0,
// //       y: 0,
// //       top: -9999,
// //       left: -9999,
// //       bottom: 20,
// //       right: 20,
// //       width: 20,
// //       height: 20,
// //     }
// //   },
// // }

// // export function useLastEditorSelection(): UseLastSelectionResult {
// //   const editor = useSlateStatic()
// //   const [lastSelection, update] = useState<Range | null>(editor.selection)

// //   const resetSelection = () => update(null)

// //   useEffect(() => {
// //     const setSelection = (newSelection: BaseSelection) => {
//       if (!newSelection) return
//       if (lastSelection && Range.equals(lastSelection, newSelection)) return
//       update(newSelection)
//     }

//     setSelection(editor.selection)
//   }, [editor.selection, lastSelection])

//   return {lastSelection, resetSelection}
// }
// /*
//  * @todo handle escape key to remove toolbar
//  * @body
//  */
// export function EditorHoveringToolbar({editor}: {editor: Editor}) {
//   const {x, y, reference, floating, strategy} = useFloating({
//     placement: 'top',
//     middleware: [offset(8), shift()],
//   })
//   const [storeFocus, sendStoreFocus] = useState(false)
//   const {lastSelection, resetSelection} = useLastEditorSelection()

//   useLayoutEffect(() => {
//     let selection = storeFocus ? lastSelection : editor.selection
//     if (
//       !selection ||
//       Range.isCollapsed(selection) ||
//       Editor.string(editor, selection) == ''
//     ) {
//       reference(defaultVirtualEl)
//       return
//     }
//     const domRange = ReactEditor.toDOMRange(editor, selection)
//     reference(domRange)
//   }, [reference, editor.selection])

//   useEffect(() => {
//     const escEvent = (e: KeyboardEvent) => {
//       // important to close the toolbar if the escape key is pressed. there's no other way than this apart from calling the `resetSelection`
//       if (e.key == 'Escape') {
//         Transforms.deselect(editor)
//         resetSelection()
//       }
//     }

//     addEventListener('keydown', escEvent)
//     return () => {
//       removeEventListener('keydown', escEvent)
//     }
//   }, [resetSelection])

// }

// function insertImageHandler(editor: Editor) {
//   return function imageClickEvent(event: MouseEvent) {
//     event.preventDefault()
//     insertImage(editor)
//   }
// }

// function insertImage(editor: Editor, url = '') {
//   let img = image({url}, [text('')])
//   Transforms.insertNodes(editor, [text(''), img, text('')])
// }
