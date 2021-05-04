import type {
  BoldKeyOption,
  BoldPluginOptionsValues,
  GetOnHotkeyToggleMarkOptions,
} from '@udecode/slate-plugins';

export const MARK_BOLD = 'bold';

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
    deserialize: {
      rules: [
        { nodeNames: ['STRONG', 'B'] },
        {
          style: {
            fontWeight: ['600', '700', 'bold'],
          },
        },
      ],
    },
  },
};
