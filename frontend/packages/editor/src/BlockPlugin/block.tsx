import React, {RefObject, useEffect, useCallback} from 'react'
import {RenderElementProps, ReactEditor, useEditor} from 'slate-react'
import {Editor} from '../editor'
import {Draggable} from 'react-beautiful-dnd'
import {css} from 'emotion'
import {useHelper} from '../HelperPlugin'
import {mergeRefs} from '../mergeRefs'
import {useBlockTools} from './blockToolsContext'

function Block({className = '', ...props}) {
  return <div className={`relative pl-4 pr-0 py-2 ${className}`} {...props} />
}

function BlockControls({
  isHovered = false,
  onAddClicked,
  dragHandleProps = {},
}) {
  return (
    <div
      className={`absolute top-0 left-0 transition duration-200 flex items-center justify-end mt-3 ${
        isHovered ? 'opacity-100' : 'opacity-0'
      } ${css`
        transform: translateX(-100%);
      `}`}
      contentEditable={false}
    >
      <div
        className="rounded-sm bg-transparent text-body hover:bg-background-muted w-6 h-8 p-1 mx-1"
        {...dragHandleProps}
      >
        <svg width="1em" height="1.5em" viewBox="0 0 16 24" fill="none">
          <path
            d="M3.5 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM14 4.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM12.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM14 12a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM5 19.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM3.5 13.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
            fill="currentColor"
          />
        </svg>
      </div>
      <button
        onClick={onAddClicked}
        className="rounded-sm bg-transparent text-body hover:bg-background-muted w-8 h-8 p-1 mx-1"
      >
        <svg width="1.5em" height="1.5em" viewBox="0 0 16 16" fill="none">
          <path
            d="M12.667 8.667h-4v4H7.334v-4h-4V7.334h4v-4h1.333v4h4v1.333z"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>
  )
}

export function EditableBlockElement(
  {children, element, attributes}: RenderElementProps,
  ref: RefObject<HTMLDivElement>,
) {
  const editor = useEditor()
  const path = ReactEditor.findPath(editor, element)
  const blockChars = Editor.charCount(editor, path)
  const {id: blockId, setBlockId} = useBlockTools()

  const {setTarget, target, onKeyDownHelper} = useHelper()

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
    <Draggable
      key={element.id}
      draggableId={element.id}
      index={path[path.length - 1]}
    >
      {(provided, snapshot) => {
        return (
          <div
            ref={mergeRefs(provided.innerRef, ref, attributes.ref)}
            {...provided.draggableProps}
            data-slate-type={element.type}
            data-slate-node={attributes['data-slate-node']}
            className={snapshot.isDragging ? 'bg-red-500' : ''}
            onMouseLeave={() => setBlockId(null)}
            onMouseEnter={() => setBlockId(element.id)}
          >
            <Block>
              <BlockControls
                isHovered={blockId === element.id}
                onAddClicked={onAddClicked}
                dragHandleProps={provided.dragHandleProps}
              />
              <div contentEditable={false} className="theme-invert">
                <div
                  className={`absolute top-0 right-0 select-none -mt-6 -mr-4 rounded shadow-md transition duration-200 flex items-center pl-2 text-xs leading-none text-body bg-black py-2 pointer-events-none ${
                    blockId === element.id ? 'opacity-100' : 'opacity-0'
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
    <Block
      path={path}
      data-slate-type={element.type}
      innerRef={ref as any}
      {...rest}
    >
      {children}
    </Block>
  )
}

// TODO: (Horacio) Fixme types
export const EditableBlock = React.forwardRef(EditableBlockElement as any)
export const ReadOnlyBlock = React.forwardRef(ReadonlyBlock as any)
