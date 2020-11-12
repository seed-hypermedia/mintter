import React from 'react'
import {css} from 'emotion'
import {BlockControls} from '../../components/blockControls'
import {useBlockMenu} from './blockMenuContext'
import {mergeRefs} from '../../mergeRefs'

export function DragDrop({element, children, componentRef, ...props}: any) {
  const ref = mergeRefs(props.ref, componentRef)
  const {
    dispatch,
    state: {blockId},
  } = useBlockMenu()

  let show = React.useMemo(() => blockId === element.id, [blockId, element.id])
  return (
    <div {...props} ref={ref}>
      <div
        className="relative"
        onMouseLeave={() => {
          dispatch({type: 'set_block_id', payload: null})
        }}
        onMouseEnter={() =>
          dispatch({type: 'set_block_id', payload: element.id})
        }
      >
        {children}
        <div
          className={`absolute m-0 p-0 leading-none transition duration-200 ${css`
            top: 2px;
            right: -9px;
          `} ${show ? 'opacity-100' : 'opacity-0'}`}
          contentEditable={false}
        >
          <BlockControls show={show} element={element} />
        </div>
      </div>
    </div>
  )
}

/*
export function DragDrop({
  element,
  componentRef,
  children,
  handleTransclusion,
  drafts,
}: any) {
  const blockRef = React.useRef<HTMLDivElement>(null)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const multiRef = mergeRefs(componentRef, rootRef)
  const {dropLine, dragRef} = useDndBlock({
    id: element.id,
    blockRef,
  })

  const {id: blockId, setBlockId} = useBlockTools()
  return (
    <div ref={multiRef}>
      <div
        className={`relative pt-2 rounded`}
        ref={blockRef}
        onMouseLeave={() => setBlockId(null)}
        onMouseEnter={() => setBlockId(element.id)}
      >
        <button
          ref={dragRef}
          className={`text-sm absolute top-0 left-0 text-body p-1 hover:bg-teal-200 transition duration-150 ${css`
            transform: translateX(-110%);
          `}`}
          contentEditable={false}
        >
          <Icons.Select title="Drag Select icon" />
        </button>

        {children}
        {blockId === element.id && (
          <div
            contentEditable={false}
            className="absolute top-0 right-0 leading-none text-xs m-1"
          >
            <BlockMenu
              onTransclude={handleTransclusion}
              element={element}
              drafts={drafts}
            />
          </div>
        )}

        {!!dropLine && (
          <div
            className={`h-1 w-full bg-blue-300 absolute`}
            style={{
              top: dropLine === 'top' ? -1 : undefined,
              bottom: dropLine === 'bottom' ? -1 : undefined,
            }}
            contentEditable={false}
          />
        )}
      </div>
    </div>
  )
}

const BlockMenu = React.forwardRef<
  HTMLButtonElement,
  {onTransclude: any; element: any; drafts: Document.AsObject[]}
>((props, ref) => {
  const menu = useMenuState({loop: true})
  return (
    <>
      <MenuButton
        {...menu}
        {...props}
        ref={ref}
        className="rounded bg-white shadow-sm p-1"
      >
        <Icons.MoreHorizontal size={16} />
      </MenuButton>
      <Menu
        {...menu}
        aria-label="Block Menu"
        className={`bg-background shadow rounded ${css`
          width: 280px;
        `}`}
      >
        <MenuItem {...menu}>
          <Icons.ArrowUpRight size={16} color="currentColor" />
          <span className="flex-1 mx-2">Open in Interaction Panel</span>
        </MenuItem>
        <MenuItem
          {...menu}
          as={DraftsMenu}
          onTransclude={props.onTransclude}
          element={props.element}
          drafts={props.drafts}
        />
        <MenuItem {...menu}>
          <Icons.CornerDownLeft size={16} color="currentColor" />
          <span className="flex-1 mx-2">Reply to this Document</span>
        </MenuItem>
      </Menu>
    </>
  )
})

const DraftsMenu = React.forwardRef<
  HTMLButtonElement,
  {onTransclude: any; element: any; drafts: Document.AsObject[]}
>(({drafts = [], ...props}, ref) => {
  const menu = useMenuState()

  return (
    <>
      <MenuButton
        ref={ref}
        {...menu}
        {...props}
        className="w-full px-2 py-2 focus:bg-teal-200 text-sm text-left disabled:opacity-50 flex items-center"
      >
        <Icons.CornerDownLeft size={16} color="currentColor" />
        <span className="flex-1 mx-2">Quote this block</span>
        <Icons.ChevronRight
          size={14}
          color="currentColor"
          className="opacity-75"
        />
      </MenuButton>

      <Menu
        {...menu}
        aria-label="Drafts"
        className={`bg-background shadow rounded ${css`
          width: 280px;
        `}`}
      >
        <MenuItem {...menu} className="text-primary flex items-center">
          <Icons.PlusCircle color="currentColor" size={14} />
          <span className="flex-1 w-full text-left text-primary mx-2">
            Create New Draft
          </span>
        </MenuItem>
        <MenuSeparator {...menu} style={{margin: 0}} />
        {drafts.map(draft => (
          <MenuItem
            key={draft.version}
            {...menu}
            onClick={() => {
              props.onTransclude?.({
                destination: draft,
                block: props.element,
              })
            }}
          >
            {draft.title || 'Untitled Document'}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
})

function MenuItem({className = '', ...props}: any) {
  return (
    <ReakitMenuItem
      {...props}
      className={`w-full px-2 py-2 focus:bg-teal-200 text-sm text-left disabled:opacity-50 flex items-center ${className}`}
    />
  )
}
* */
