import {Account} from '@mintter/shared'
import {Button, ButtonProps} from '@mintter/ui'
import {NodeSpec} from '@tiptap/pm/model'
import {Decoration, DecorationSet} from '@tiptap/pm/view'
import {keymap} from 'prosemirror-keymap'
import {NodeSelection, Plugin, PluginKey} from 'prosemirror-state'
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {keyboardStack, useKeyboard} from './keyboard-helpers'

export function createAutoCompletePlugin<N extends string, T>(args: {
  nodeName: N
  triggerCharacter: string
  renderPopup: (
    state: AutocompleteTokenPluginState<T>,
    actions: AutocompleteTokenPluginActions,
  ) => void
}): {plugins: Array<Plugin>; nodes: {[key in N]: NodeSpec}} {
  const {nodeName, triggerCharacter, renderPopup} = args
  const pluginKey = new PluginKey(nodeName)
  const dataAttr = `data-${nodeName}`

  // this is the node that will be rendered in the editor
  const autocompleteTokenNode: NodeSpec = {
    priority: 1000,
    group: 'inline',
    inline: true,
    atom: true,
    attrs: {[nodeName]: {default: ''}},
    toDOM: (node) => {
      const span = document.createElement('span')
      const nodeAttr = node.attrs[nodeName]
      span.setAttribute(dataAttr, nodeAttr)
      return span
    },
    parseDOM: [
      {
        tag: `span[${dataAttr}]`,
        getAttrs: (dom) => {
          if (dom instanceof HTMLElement) {
            var value = dom.getAttribute(dataAttr)
            return {[nodeName]: value}
          }
          return false
        },
      },
    ],
  }

  const autocompleteTokenPlugin = new Plugin<AutocompleteTokenPluginState<T>>({
    priority: 1000,
    key: pluginKey,
    state: {
      init() {
        return {active: false}
      },
      apply(tr, state) {
        const action: AutocompleteTokenPluginAction | undefined =
          tr.getMeta(pluginKey)

        if (action) {
          // this controls if we need to open the suggestions popup or not
          if (action.type == 'open') {
            const {pos, rect} = action
            const newState: AutocompleteTokenPluginState<T> = {
              active: true,
              range: {from: pos, to: pos},
              text: '',
              rect: rect,
            }
            return newState
          } else if (action.type === 'close') {
            return {active: false}
          }
        }

        // Update the range and compute query.
        if (state.active) {
          const {range} = state
          const from =
            range.from === range.to ? range.from : tr.mapping.map(range.from)
          const to = tr.mapping.map(range.to)

          const text = tr.doc.textBetween(from, to, '\n', '\0')
          if (!text.startsWith(triggerCharacter)) {
            // Close when deleting the #.
            return {active: false}
          }

          const queryText = text.slice(1) // Remove the leading "#" (triggerCharacter)
          const newState: AutocompleteTokenPluginState<T> = {
            ...state,
            range: {from, to},
            text: queryText,
          }
          return newState
        }

        return {active: false}
      },
    },
    props: {
      handleKeyDown(view, e) {
        const state = pluginKey.getState(view.state)

        if (state.active && keyboardStack.handleKeyDown(e)) {
          return true
        }

        const dispatch = (action: AutocompleteTokenPluginAction) => {
          view.dispatch(view.state.tr.setMeta(pluginKey, action))
        }

        // if key is #, check that the previous position is blank and the next position is blank.
        if (e.key === triggerCharacter) {
          const tr = view.state.tr
          var selection = tr.selection
          // Collapsed selection
          if (selection.from === selection.to) {
            const $position = selection.$from
            const isStart = $position.pos === $position.start()
            const isEnd = $position.pos === $position.end()
            const emptyPrev = Boolean(
              !isStart &&
                $position.doc
                  .textBetween($position.pos - 1, $position.pos, '\n', '\0')
                  .match(/\s/),
            )
            const emptyNext = Boolean(
              !isEnd &&
                $position.doc
                  .textBetween($position.pos, $position.pos + 1, '\n', '\0')
                  .match(/\s/),
            )

            if ((isStart || emptyPrev) && (isEnd || emptyNext)) {
              const pos = $position.pos
              const rect = view.coordsAtPos(pos)
              dispatch({type: 'open', pos, rect})

              // Don't override the actual input.
              return false
            }
          }
        }

        return false
      },
      handleClick(view) {
        const state = pluginKey.getState(view.state)

        if (state.active) {
          view.dispatch(view.state.tr.setMeta(pluginKey, {type: 'close'}))
        }
      },
      decorations(editorState) {
        const state: AutocompleteTokenPluginState<T> =
          pluginKey.getState(editorState)
        if (!state.active) {
          return null
        }
        const {range} = state
        return DecorationSet.create(editorState.doc, [
          Decoration.inline(range.from, range.to, {
            nodeName: 'span',
            style: 'color:#999;',
          }),
        ])
      },
    },
    view() {
      return {
        update(view) {
          var state: AutocompleteTokenPluginState<T> = pluginKey.getState(
            view.state,
          )

          const onCreate = (
            value: string,
            range: {from: number; to: number},
          ) => {
            const node = view.state.schema.nodes[nodeName].create({
              ref: `hm://a/${value.id}`,
            })
            view.dispatch(view.state.tr.replaceWith(range.from, range.to, node))
          }

          const dispatch = (action: AutocompleteTokenPluginAction) => {
            view.dispatch(view.state.tr.setMeta(pluginKey, action))
          }
          const onClose = () => dispatch({type: 'close'})

          renderPopup(state, {onCreate, onClose})
        },
        destroy() {
          console.log('======= DESTROY ME!!')
          renderPopup({active: false}, {onCreate: () => {}, onClose: () => {}})
        },
      }
    },
  })

  return {
    nodes: {[nodeName]: autocompleteTokenNode} as any,
    plugins: [
      autocompleteTokenPlugin,
      keymap({
        Backspace: (state, dispatch) => {
          const {node} = state.selection as NodeSelection
          if (node) {
            node.type == state.schema.nodes[nodeName]
            if (dispatch) {
              dispatch(state.tr.deleteSelection())
            }
            return true
          }
          return false
        },
      }),
    ],
  }
}

export function AutocompletePopup(props: {
  state: AutocompleteTokenPluginState<string>
  actions: AutocompleteTokenPluginActions
  editor: any
}) {
  if (!props.state.active) {
    return null
  }

  return (
    <AutocompletePopupInner
      editor={props.editor}
      {...props.state}
      {...props.actions}
    />
  )
}

function AutocompletePopupInner(
  props: AutocompleteTokenPluginActiveState<string> &
    AutocompleteTokenPluginActions & {
      editor: any
    },
) {
  const {rect, text, onClose, range, onCreate, editor} = props

  const misses = useRef(0)

  const suggestions = useMemo(() => {
    const list = getSuggestions(editor.mentionOptions || [], text)

    if (list.length === 0) {
      misses.current++
    } else {
      misses.current = 0
    }
    return list
  }, [text])

  const [index, setIndex] = useState(0)

  useKeyboard({
    ArrowUp: () => {
      setIndex(strangle(index - 1, [0, suggestions.length - 1]))
      return true
    },
    ArrowDown: () => {
      setIndex(strangle(index + 1, [0, suggestions.length - 1]))
      return true
    },
    Enter: () => {
      if (index < suggestions.length) {
        onCreate(suggestions[index], range)
        onClose()
      }
      return true
    },
    Escape: () => {
      onClose()
      return true
    },
  })

  useEffect(() => {
    if (misses.current > 5) {
      onClose()
    }
  }, [misses.current > 5])

  return (
    <div
      style={{
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        zIndex: 999999,
      }}
    >
      <div
        style={{
          position: 'fixed',
          width: '100vw',
          height: '100vh',
          top: 0,
          left: 0,
        }}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onClose()
        }}
      />
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          width: '20em',
          height: '10em',
          borderRadius: 4,
          overflow: 'scroll',
          backgroundColor: 'transparent',
        }}
      >
        {/* <div>Query: "{text}"</div> */}
        {suggestions.length === 0 && <div>No Results</div>}
        {suggestions.map((suggestion, i) => {
          return (
            <SuggestionItem
              selected={i === index}
              name={suggestion.profile.alias}
              key={suggestion.id}
              onMouseEnter={() => {
                // setIndex(i)
              }}
              onPress={() => {
                onCreate(suggestion, range)
                onClose()
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

function strangle(n: number, minMax: [number, number]) {
  return Math.max(Math.min(n, minMax[1]), minMax[0])
}

function getSuggestions(options: Array<any>, queryText: string) {
  let result = options.filter((acc) => {
    let alias = acc.profile.alias
    return alias.toLowerCase().includes(queryText.toLowerCase())
  })

  return result
}

export type AutocompleteTokenPluginState<T> =
  | {active: false}
  | AutocompleteTokenPluginActiveState<T>

export type AutocompleteTokenPluginActiveState<T> = {
  active: true
  // The cursor selection where we get text from
  range: {from: number; to: number}
  // The text we use to search
  text: string
  // Where to position the popup
  rect: {bottom: number; left: number}
}

export type AutocompleteTokenPluginActions = {
  onCreate: (nodeAttr: string, range: {from: number; to: number}) => void
  onClose: () => void
}

export type AutocompleteTokenPluginAction =
  | {type: 'open'; pos: number; rect: {bottom: number; left: number}}
  | {type: 'close'}

const SuggestionItem = React.memo(function SuggestionItem(props: {
  embedRef?: Account
  name?: string
  selected: boolean
  onPress: ButtonProps['onPress']
  onMouseEnter: ButtonProps['onMouseEnter']
}) {
  const elm = useRef<HTMLButtonElement | null>(null)

  useLayoutEffect(() => {
    if (props.selected) {
      elm.current?.scrollIntoView()
    }
  }, [props.selected])

  if (!props.embedRef && !props.name) {
    return null
  }

  return (
    <Button
      ref={elm}
      onPress={props.onPress}
      fontWeight="600"
      size="$2"
      jc="flex-start"
      borderRadius={0}
      bg={props.selected ? '$blue10' : '$backgroundFocus'}
      color={props.selected ? 'white' : '$color'}
      hoverStyle={{
        bg: '$blue10',
        borderColor: '$colorTransparent',
        color: 'white',
      }}
      onMouseEnter={props.onMouseEnter}
      // icon={<Avatar size={18} url={props.embedRef?.profile?.avatar} />} avatars make everything slooow
    >
      {props.name}
    </Button>
  )
})
