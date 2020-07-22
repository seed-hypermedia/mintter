import {
  BoldKeyOption,
  BoldPluginOptionsValues,
  MarkOnKeyDownOptions,
} from '@udecode/slate-plugins'

export const MARK_BOLD = 'bold'

export const BOLD_OPTIONS: Record<
  BoldKeyOption,
  BoldPluginOptionsValues & MarkOnKeyDownOptions
> = {
  bold: {
    type: MARK_BOLD,
    rootProps: {
      className: 'font-bold',
      as: 'strong',
    },
  },
}
