import type {
  UnderlineKeyOption,
  UnderlinePluginOptionsValues,
  GetOnHotkeyToggleMarkOptions,
} from '@udecode/slate-plugins';

export const MARK_UNDERLINE = 'underline';

export const UNDERLINE_OPTIONS: Record<
  UnderlineKeyOption,
  UnderlinePluginOptionsValues & GetOnHotkeyToggleMarkOptions
> = {
  underline: {
    type: MARK_UNDERLINE,
    hotkey: 'mod+u',
    rootProps: {
      className: 'underline',
      as: 'span',
    },
  },
};
