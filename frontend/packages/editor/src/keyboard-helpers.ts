import {useCallback, useEffect, useRef} from 'react'
import {base, keyName} from 'w3c-keyname'

type KeyboardEventHandler = (event: KeyboardEvent) => boolean
type KeyboardBindings = Record<string, KeyboardEventHandler>

// This logic is ripped out of prosemirror-keymap

const mac =
  typeof navigator != 'undefined' ? /Mac/.test(navigator.platform) : false

function normalizeKeyName(name: string): string {
  let parts = name.split(/-(?!$)/),
    result = parts[parts.length - 1]
  if (result == 'Space') result = ' '
  let alt, ctrl, shift, meta
  for (let i = 0; i < parts.length - 1; i++) {
    let mod = parts[i]
    if (/^(cmd|meta|m)$/i.test(mod)) meta = true
    else if (/^a(lt)?$/i.test(mod)) alt = true
    else if (/^(c|ctrl|control)$/i.test(mod)) ctrl = true
    else if (/^s(hift)?$/i.test(mod)) shift = true
    else if (/^mod$/i.test(mod)) {
      if (mac) meta = true
      else ctrl = true
    } else throw new Error('Unrecognized modifier name: ' + mod)
  }
  if (alt) result = 'Alt-' + result
  if (ctrl) result = 'Ctrl-' + result
  if (meta) result = 'Meta-' + result
  if (shift) result = 'Shift-' + result
  return result
}

function normalize<T>(map: Record<string, T>): Record<string, T> {
  let copy = Object.create(null)
  for (let prop in map) copy[normalizeKeyName(prop)] = map[prop]
  return copy
}

function modifiers(name: string, event: KeyboardEvent, shift: boolean) {
  if (event.altKey) name = 'Alt-' + name
  if (event.ctrlKey) name = 'Ctrl-' + name
  if (event.metaKey) name = 'Meta-' + name
  if (shift !== false && event.shiftKey) name = 'Shift-' + name
  return name
}

// Key names may be strings like `"Shift-Ctrl-Enter"`—a key
// identifier prefixed with zero or more modifiers. Key identifiers
// are based on the strings that can appear in
// [`KeyEvent.key`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key).
// Use lowercase letters to refer to letter keys (or uppercase letters
// if you want shift to be held). You may use `"Space"` as an alias
// for the `" "` name.
//
// Modifiers can be given in any order. `Shift-` (or `s-`), `Alt-` (or
// `a-`), `Ctrl-` (or `c-` or `Control-`) and `Cmd-` (or `m-` or
// `Meta-`) are recognized. For characters that are created by holding
// shift, the `Shift-` prefix is implied, and should not be added
// explicitly.
//
// You can use `Mod-` as a shorthand for `Cmd-` on Mac and `Ctrl-` on
// other platforms.
export function keydownHandler(bindings: KeyboardBindings) {
  let map = normalize(bindings)
  return function (event: KeyboardEvent) {
    let name = keyName(event),
      isChar = name.length == 1 && name != ' ',
      baseName

    let direct = map[modifiers(name, event, !isChar)]
    if (direct && direct(event)) return true
    if (
      isChar &&
      (event.shiftKey ||
        event.altKey ||
        event.metaKey ||
        name.charCodeAt(0) > 127) &&
      (baseName = base[event.keyCode]) &&
      baseName != name
    ) {
      // Try falling back to the keyCode when there's a modifier
      // active or the character produced isn't ASCII, and our table
      // produces a different name from the the keyCode. See #668,
      // #1060
      let fromCode = map[modifiers(baseName, event, true)]
      if (fromCode && fromCode(event)) return true
    } else if (isChar && event.shiftKey) {
      // Otherwise, if shift is active, also try the binding with the
      // Shift- prefix enabled. See #997
      let withShift = map[modifiers(name, event, true)]
      if (withShift && withShift(event)) return true
    }
    return false
  }
}

// This is the stack of keyboard event listeners.

class KeyboardStack {
  stack: Array<KeyboardEventHandler> = []

  add = (handler: KeyboardEventHandler) => {
    this.stack.push(handler)
    return () => this.remove(handler)
  }

  remove = (handler: KeyboardEventHandler) => {
    const index = this.stack.indexOf(handler)
    if (index >= 0) {
      this.stack.splice(index, 1)
    }
  }

  handleKeyDown: KeyboardEventHandler = (event) => {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const handler = this.stack[i]
      if (handler(event)) {
        return true
      }
    }
    return false
  }
}

export const keyboardStack = new KeyboardStack()

export function useKeyboard(bindings: KeyboardBindings) {
  // Hoist bindings so the callback never changes.
  // This makes it so you don't have to worry so much about binding the callback functions.
  const ref = useRef(bindings)
  ref.current = bindings

  const callback = useCallback(
    (event: KeyboardEvent) => keydownHandler(ref.current)(event),
    [],
  )

  useEffect(() => keyboardStack.add(callback), [])
}
