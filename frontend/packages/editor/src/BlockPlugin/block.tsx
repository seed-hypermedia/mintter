import React, {RefObject, useEffect, useCallback} from 'react'
import {RenderElementProps, ReactEditor, useEditor} from 'slate-react'
import {Editor} from '../editor'
import {Draggable} from 'react-beautiful-dnd'
import {css} from 'emotion'
import Tippy from '@tippyjs/react'
import {useHelper} from '../HelperPlugin'
import {mergeRefs} from '../mergeRefs'

function Block({path, className = '', ...props}) {
  return (
    <div
      className={`relative pl-8 py-2 transition duration-200 rounded hover:bg-background-muted ${className}`}
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
  const hide = () => setVisible(false)

  const {setTarget, target, onKeyDownHelper} = useHelper()

  function handleMouseEnter() {
    setHover(true)
  }

  function handleMouseLeave() {
    setHover(false)
    hide()
  }

  function onAddClicked(e) {
    e.preventDefault()
    const value = target ? null : e.target
    // console.log('LEAF: ', true)
    setTarget(value, path)
  }

  const formatter = new Intl.NumberFormat('en-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumSignificantDigits: 3,
  })

  const price = formatter.format(blockChars * 0.0001)

  const onKeyDown = useCallback(
    e => {
      onKeyDownHelper(e, editor)
    },
    [editor, onKeyDownHelper],
  )

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onKeyDown])

  return (
    <Draggable key={element.id} draggableId={element.id} index={path[0]}>
      {provided => {
        return (
          <div
            ref={mergeRefs(provided.innerRef, ref, attributes.ref)}
            {...provided.draggableProps}
            className="first:mt-8"
            data-slate-type={element.type}
            data-slate-node={attributes['data-slate-node']}
          >
            <Block
              path={path}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div
                className={`absolute top-0 left-0 transition duration-200 flex items-center mt-3 ${
                  isHover ? 'opacity-100' : 'opacity-0'
                } ${css`
                  transform: translateX(-4.5rem);
                `}`}
                contentEditable={false}
              >
                <Tippy
                  delay={300}
                  content={
                    <span
                      className={`px-2 py-1 text-xs font-light transition duration-200 rounded bg-muted-hover ${css`
                        background-color: #3f3f3f;
                        color: #ccc;
                      `}`}
                    >
                      Add or edit block
                    </span>
                  }
                >
                  <button
                    onClick={onAddClicked}
                    className="rounded-sm bg-transparent text-body hover:bg-background-muted w-8 h-8 p-1 mr-2"
                  >
                    <svg
                      width="1.5em"
                      height="1.5em"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M12.667 8.667h-4v4H7.334v-4h-4V7.334h4v-4h1.333v4h4v1.333z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                </Tippy>
                <Tippy
                  delay={300}
                  content={
                    <span
                      className={`px-2 py-1 text-xs font-light transition duration-200 rounded bg-muted-hover ${css`
                        background-color: #3f3f3f;
                        color: #ccc;
                      `}`}
                    >
                      Drag to move
                    </span>
                  }
                >
                  <div
                    className="rounded-sm bg-transparent text-body hover:bg-background-muted w-6 h-8 p-1"
                    {...provided.dragHandleProps}
                  >
                    <svg
                      width="1em"
                      height="1.5em"
                      viewBox="0 0 16 24"
                      fill="none"
                    >
                      <path
                        d="M3.5 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM14 4.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM12.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM14 12a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM5 19.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM3.5 13.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                </Tippy>
              </div>
              <div contentEditable={false} className="theme-invert">
                <div
                  className={`absolute top-0 right-0 select-none -mt-6 -mr-4 rounded shadow-md transition duration-200 flex items-center pl-2 text-xs leading-none text-body bg-black py-2 pointer-events-none ${
                    isHover ? 'opacity-100' : 'opacity-0'
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
