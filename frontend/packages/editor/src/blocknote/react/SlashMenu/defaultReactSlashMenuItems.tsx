import {
  BaseSlashMenuItem,
  DefaultBlockSchema,
  defaultSlashMenuItems,
} from "@/blocknote/core";
import {HMBlockSchema} from "@/schema";
import {MdPreview} from "react-icons/md";
import {
  RiChatQuoteLine,
  RiCodeLine,
  RiFolder2Line,
  RiH1,
  RiPlayCircleLine,
  RiText,
} from "react-icons/ri";
import {ReactSlashMenuItem} from "./ReactSlashMenuItem";
const extraFields: Record<
  string,
  Omit<
    ReactSlashMenuItem<DefaultBlockSchema>,
    keyof BaseSlashMenuItem<DefaultBlockSchema>
  >
> = {
  Heading: {
    group: "Text Content",
    icon: <RiH1 size={18} />,
    hint: "Group content with a title",
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
    group: "Text Content",
    icon: <RiText size={18} />,
    hint: "Used for the body of your document",
    // shortcut: formatKeyboardShortcut('Mod-Alt-0'),
  },

  Code: {
    group: "Text Content",
    icon: <RiCodeLine size={18} />,
    hint: "Test code",
  },

  Blockquote: {
    group: "Text Content",
    icon: <RiChatQuoteLine size={18} />,
    hint: "Test blockquote",
  },

  "Video / Audio": {
    group: "Media",
    icon: <RiPlayCircleLine size={18} />,
    hint: "Multimedia player",
    // shortcut: formatKeyboardShortcut('Mod-Alt-0'),
  },

  "File / Folder": {
    group: "Media",
    icon: <RiFolder2Line size={18} />,
    hint: "Include Files and Folders for downloading",
    // shortcut: formatKeyboardShortcut('Mod-Alt-0'),
  },
  Embed: {
    group: "Media",
    icon: <MdPreview size={18} />,
    hint: "Include a HyperDocs Section or Document",
    // shortcut: formatKeyboardShortcut('Mod-Alt-0'),
  },
};

export const defaultReactSlashMenuItems = defaultSlashMenuItems
  .map((item) => {
    if (!extraFields[item.name]) {
      return false;
    }
    return new ReactSlashMenuItem<HMBlockSchema>(
      item.name,
      item.execute,
      item.aliases,
      extraFields[item.name].group,
      extraFields[item.name].icon,
      extraFields[item.name].hint,
      extraFields[item.name].shortcut
    );
  })
  .filter(Boolean);
