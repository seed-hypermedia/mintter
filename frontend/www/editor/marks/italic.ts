import {
  ItalicKeyOption,
  ItalicPluginOptionsValues,
  GetOnHotkeyToggleMarkOptions,
} from '@udecode/slate-plugins'

export const MARK_ITALIC = 'italic'

export const ITALIC_OPTIONS: Record<
  ItalicKeyOption,
  ItalicPluginOptionsValues & GetOnHotkeyToggleMarkOptions
> = {
  italic: {
    type: MARK_ITALIC,
    rootProps: {
      className: 'italic',
      as: 'em',
    },
  },
}
