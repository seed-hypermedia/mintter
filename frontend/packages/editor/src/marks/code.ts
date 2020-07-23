import {
  CodeKeyOption,
  CodePluginOptionsValues,
  MarkOnKeyDownOptions,
} from '@udecode/slate-plugins'

export const MARK_CODE = 'code'

export const CODE_OPTIONS: Record<
  CodeKeyOption,
  CodePluginOptionsValues & MarkOnKeyDownOptions
> = {
  code: {
    type: MARK_CODE,
    hotkey: 'mod+e',
    rootProps: {
      className: 'bg-muted text-body text-sm py-1 px-2 rounded-sm border-none',
      as: 'code',
    },
  },
}
