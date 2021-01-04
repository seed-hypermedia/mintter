import {
  BoldKeyOption,
  BoldPluginOptionsValues,
  GetOnHotkeyToggleMarkOptions,
} from '@udecode/slate-plugins'

export const MARK_BOLD = 'bold'

export const BOLD_OPTIONS: Record<
  BoldKeyOption,
  BoldPluginOptionsValues & GetOnHotkeyToggleMarkOptions
> = {
  bold: {
    type: MARK_BOLD,
    rootProps: {
      className: 'font-bold',
      as: 'strong',
    },
  },
}
