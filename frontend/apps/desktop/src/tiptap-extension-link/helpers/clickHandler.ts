import {open} from '@tauri-apps/api/shell'
import {getAttributes} from '@tiptap/core'
import {MarkType} from '@tiptap/pm/model'
import {Plugin, PluginKey} from '@tiptap/pm/state'

type ClickHandlerOptions = {
  type: MarkType
}

export function clickHandler(options: ClickHandlerOptions): Plugin {
  return new Plugin({
    key: new PluginKey('handleClickLink'),
    props: {
      handleClick: (view, pos, event) => {
        if (event.button !== 0) {
          return false
        }

        const attrs = getAttributes(view.state, options.type.name)

        const href = attrs.href

        if (href) {
          open(href)
          return true
        }

        return false
      },
    },
  })
}
