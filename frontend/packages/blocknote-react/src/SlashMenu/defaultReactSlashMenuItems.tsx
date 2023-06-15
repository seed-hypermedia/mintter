import {
  BaseSlashMenuItem,
  DefaultBlockSchema,
  defaultSlashMenuItems,
} from '@mtt-blocknote/core'
import {RiH1, RiListOrdered, RiListUnordered, RiText} from 'react-icons/ri'
import {ReactSlashMenuItem} from './ReactSlashMenuItem'
const extraFields: Record<
  string,
  Omit<
    ReactSlashMenuItem<DefaultBlockSchema>,
    keyof BaseSlashMenuItem<DefaultBlockSchema>
  >
> = {
  Heading: {
    group: 'Text Content',
    icon: <RiH1 size={18} />,
    hint: 'Group content with a title',
    // shortcut: formatKeyboardShortcut('Mod-Alt-1'),
  },
  // 'Heading 2': {
  //   group: 'Text Content',
  //   icon: <RiH2 size={18} />,
  //   hint: 'Used for key sections',
  //   // shortcut: formatKeyboardShortcut('Mod-Alt-2'),
  // },
  // 'Heading 3': {
  //   group: 'Text Content',
  //   icon: <RiH3 size={18} />,
  //   hint: 'Used for subsections and group headings',
  //   // shortcut: formatKeyboardShortcut('Mod-Alt-3'),
  // },
  // 'Numbered List': {
  //   group: 'Text Content',
  //   icon: <RiListOrdered size={18} />,
  //   hint: 'Used to display a numbered list',
  //   // shortcut: formatKeyboardShortcut('Mod-Alt-7'),
  // },
  // 'Bullet List': {
  //   group: 'Text Content',
  //   icon: <RiListUnordered size={18} />,
  //   hint: 'Used to display an unordered list',
  //   // shortcut: formatKeyboardShortcut('Mod-Alt-9'),
  // },
  Paragraph: {
    group: 'Text Content',
    icon: <RiText size={18} />,
    hint: 'Used for the body of your document',
    // shortcut: formatKeyboardShortcut('Mod-Alt-0'),
  },
}

export const defaultReactSlashMenuItems = defaultSlashMenuItems
  .map((item) => {
    if (!extraFields[item.name]) {
      return false
    }
    return new ReactSlashMenuItem<DefaultBlockSchema>(
      item.name,
      item.execute,
      item.aliases,
      extraFields[item.name].group,
      extraFields[item.name].icon,
      extraFields[item.name].hint,
      extraFields[item.name].shortcut,
    )
  })
  .filter(Boolean)
