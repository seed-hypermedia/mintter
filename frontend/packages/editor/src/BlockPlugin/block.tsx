import React, {RefObject} from 'react'
// import {Transforms} from 'slate'
import {RenderElementProps, ReactEditor, useEditor} from 'slate-react'
// import {Icons} from '../components/icons'
import {Editor} from '../editor'
import {Draggable} from 'react-beautiful-dnd'
import {css} from 'emotion'
// import Tippy from '@tippyjs/react'

const mergeRefs = (...refs) => {
  const filteredRefs = refs.filter(Boolean)
  if (!filteredRefs.length) return null
  if (filteredRefs.length === 0) return filteredRefs[0]
  return inst => {
    for (const ref of filteredRefs) {
      if (typeof ref === 'function') {
        ref(inst)
      } else if (ref) {
        ref.current = inst
      }
    }
  }
}

function Block({path, className = '', ...props}) {
  return (
    <div
      className={`relative px-8 py-2 hover:bg-background-muted transition duration-200 rounded ${className}`}
      {...props}
    />
  )
}

export function EditableBlockElement(
  {children, element, attributes}: RenderElementProps,
  ref: RefObject<HTMLDivElement>,
) {
  const editor = useEditor()
  const path = ReactEditor.findPath(editor, element)
  const blockChars = Editor.charCount(editor, path)
  const [isHover, setHover] = React.useState<boolean>(false)
  const [, setVisible] = React.useState<boolean>(true)
  // const show = () => setVisible(true)
  const hide = () => setVisible(false)

  function handleMouseEnter() {
    setHover(true)
  }

  function handleMouseLeave() {
    setHover(false)
    hide()
  }

  const formatter = new Intl.NumberFormat('en-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumSignificantDigits: 3,
  })

  const price = formatter.format(blockChars * 0.0001)

  return (
    <Draggable key={element.id} draggableId={element.id} index={path[0]}>
      {(provided, snapshot) => {
        console.log('BLOCK: provided', {provided, snapshot})

        return (
          <div
            ref={mergeRefs(provided.innerRef, ref, attributes.ref)}
            {...provided.draggableProps}
            className="group first:mt-8"
            data-slate-type={element.type}
            data-slate-node={attributes['data-slate-node']}
          >
            <Block
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              path={path}
            >
              <div
                className={`rounded-sm bg-background-muted w-6 h-6 absolute top-0 left-0 opacity-0 group-hover:opacity-100 transition p-1 duration-200 ${css`
                  transform: translateX(-2rem);
                `}`}
                contentEditable={false}
                {...provided.dragHandleProps}
              >
                <svg width="1em" height="1em" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 4a1 1 0 100-2 1 1 0 000 2zM9 3a1 1 0 11-2 0 1 1 0 012 0zM9 13a1 1 0 11-2 0 1 1 0 012 0zM8 9a1 1 0 100-2 1 1 0 000 2zM14 3a1 1 0 11-2 0 1 1 0 012 0zM13 14a1 1 0 100-2 1 1 0 000 2zM14 8a1 1 0 11-2 0 1 1 0 012 0zM4 13a1 1 0 11-2 0 1 1 0 012 0zM3 9a1 1 0 100-2 1 1 0 000 2z"
                    fill="#000"
                  />
                </svg>
              </div>
              <div contentEditable={false} className="theme-invert">
                <div
                  className={`absolute top-0 right-0 select-none -mt-6 -mr-4 rounded shadow-md transition duration-200 flex items-center pl-2 text-xs leading-none text-body bg-black py-2 ${
                    isHover
                      ? 'pointer-events-auto opacity-100'
                      : 'pointer-events-none opacity-0'
                  }`}
                >
                  <p className={`text-body-muted border-r px-2 text-xs`}>
                    <span>Characters:</span>{' '}
                    {/* TODO: FIX avoid characters to jump when change chars number */}
                    <span className={`inline-block text-right text-body-muted`}>
                      {blockChars}
                    </span>
                  </p>
                  <p className="px-2 text-body-muted text-xs">
                    Royalties: {price}
                  </p>
                </div>
              </div>
              {children}
            </Block>
          </div>
        )
      }}
    </Draggable>
  )
}

export function ReadonlyBlock(
  {children, element, ...rest}: RenderElementProps,
  ref: RefObject<HTMLDivElement>,
) {
  const editor = useEditor()
  const path = ReactEditor.findPath(editor, element)

  return (
    <Block path={path} data-slate-type={element.type} ref={ref} {...rest}>
      {children}
    </Block>
  )
}

// TODO: (Horacio) Fixme types
export const EditableBlock = React.forwardRef(EditableBlockElement as any)
export const ReadOnlyBlock = React.forwardRef(ReadonlyBlock as any)

// function SettingsButton({block, path, visible, show, hide}) {
//   const {title, description} = block
//   const titleRef = React.useRef<HTMLInputElement>(null)
//   const editor = useEditor()
//   const [innterTitle, setTitle] = React.useState<string>(() => title || '')
//   const [innterDescription, setDescription] = React.useState<string>(
//     () => description || '',
//   )

//   function toggleFormMetadata() {
//     if (visible) {
//       hide()
//     } else {
//       show()
//       titleRef.current?.focus()
//     }
//   }

//   return (
//     <Tippy
//       visible={visible}
//       placement="bottom-end"
//       interactive
//       onClickOutside={hide}
//       content={
//         <div
//           contentEditable={false}
//           className={`theme-light select-none transition duration-200 p-2 rounded bg-gray-400 shadow-md`}
//         >
//           <div>
//             <label
//               className="block text-sm text-heading mb-2"
//               htmlFor="block-title"
//             >
//               title:
//             </label>
//             <input
//               className="block w-full px-2 py-1 bg-white rounded-sm border-muted-hover text-body"
//               name="title"
//               ref={titleRef}
//               onClick={e => e.stopPropagation()}
//               type="text"
//               placeholder="title"
//               value={innterTitle}
//               onChange={e => {
//                 setTitle(e.target.value)
//                 Transforms.setNodes(editor, {title: e.target.value}, {at: path})
//               }}
//             />
//           </div>
//           <div className="mt-2">
//             <label
//               className="block text-sm text-heading mb-2"
//               htmlFor="block-title"
//             >
//               description:
//             </label>
//             <textarea
//               className="block w-full px-2 py-1 bg-white rounded-sm border-muted-hover text-body"
//               name="description"
//               onClick={e => e.stopPropagation()}
//               placeholder="block description"
//               value={innterDescription}
//               onChange={e => {
//                 setDescription(e.target.value)
//                 Transforms.setNodes(
//                   editor,
//                   {description: e.target.value},
//                   {at: path},
//                 )
//               }}
//             />
//           </div>
//         </div>
//       }
//     >
//       <button className="px-3 py-2" onClick={toggleFormMetadata}>
//         <Icons.Settings
//           // fill="currentColor"
//           className="text-white"
//           size={16}
//           color="currentColor"
//           strokeWidth="1"
//         />
//       </button>
//     </Tippy>
//   )
// }
