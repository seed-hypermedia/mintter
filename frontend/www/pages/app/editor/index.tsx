import React from "react";

import { Transforms, Node, Range } from "slate";
import { Slate, Editable, ReactEditor } from "slate-react";
import { Editor, Portal, Toolbar } from "@mintter/editor";

import isHotkey from "is-hotkey";
import Sidebar from "./editorSidebar";
import Seo from "../../../components/seo";
import Leaf from "../../../components/leaf";
import Element from "../../../components/elements";
import useCustomEditor from "../../../components/useEditor";
import DocumentStatus from "../../../components/documentStatus";
import { DebugValue } from "../../../components/debug";
import { css } from "emotion";
import { shortcutTypes } from "@mintter/slate-plugin-with-shortcuts";
import { wrapLink, unwrapLink } from "@mintter/slate-plugin-with-links";
import Container from "../../../components/container";
import Textarea from "../../../components/textarea";

export const types = {
  ...shortcutTypes,
  TITLE: "title",
  DESCRIPTION: "description",
  DOCUMENT_HEADER: "document-header",
  BLOCK: "section"
} as const;

const HOTKEYS = {
  "mod+b": "bold",
  "mod+i": "italic",
  "mod+u": "underline",
  "mod+`": "code"
};

const LIST_TYPES = [types.NUMBERED_LIST, types.BULLETED_LIST];

const initialValue = [
  // {
  //   type: types.DOCUMENT_HEADER,
  //   children: [
  //     {
  //       type: types.TITLE,
  //       children: [
  //         {
  //           text: "A default title"
  //         }
  //       ]
  //     },
  //     {
  //       type: types.DESCRIPTION,
  //       children: [
  //         {
  //           text:
  //             "What is this document about? this description will always be public, it helps readers to get a glance of what the document is about."
  //         }
  //       ]
  //     }
  //   ]
  // },
  {
    type: types.PARAGRAPH,
    children: [
      {
        text: ""
      }
    ]
  }
];

export default function EditorPage(): JSX.Element {
  const editor = useCustomEditor() as ReactEditor;
  const [value, setValue] = React.useState<Node[]>(initialValue);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [title, setTitle] = React.useState<string>("");
  const [description, setDescription] = React.useState<string>("");

  // send focus to the editor when you click outside.
  // TODO: check if focus is on title or description
  React.useEffect(() => {
    function wrapperClick(e) {
      if (
        !ReactEditor.isFocused(editor) &&
        typeof e.target.value !== "string"
      ) {
        ReactEditor.focus(editor);
        Transforms.select(editor, Editor.end(editor, []));
      }
    }

    wrapperRef.current.addEventListener("click", wrapperClick);

    return () => {
      wrapperRef.current.removeEventListener("click", wrapperClick);
    };
  }, []);

  // modal selection (range)
  const [modal, setModal] = React.useState(null);

  //modal ref
  const ref = React.useRef();

  // modal blocks index
  const [index, setIndex] = React.useState(0);

  const renderElement = React.useCallback(
    props => (
      <Element
        {...props}
        onAddBlock={() => {
          const path = ReactEditor.findPath(editor, props.element);
          const start = Editor.start(editor, path);
          const end = Editor.end(editor, path);
          Transforms.select(editor, end);
          if (modal) {
            setModal(null);
            setIndex(0);
          } else {
            setModal({
              anchor: start,
              focus: start
            });
          }
          ReactEditor.focus(editor);
        }}
      />
    ),

    [modal]
  );
  const renderLeaf = React.useCallback(props => <Leaf {...props} />, []);

  const onKeyDown = React.useCallback(
    event => {
      if (modal) {
        switch (event.key) {
          case "ArrowDown":
            event.preventDefault();
            const prevIndex = index >= blocks.length - 1 ? 0 : index + 1;
            setIndex(prevIndex);
            break;
          case "ArrowUp":
            event.preventDefault();
            const nextIndex = index <= 0 ? blocks.length - 1 : index - 1;
            setIndex(nextIndex);
            break;
          case "Tab":
          case "Enter":
            event.preventDefault();
            Editor.removeBackslash(editor);
            Transforms.setNodes(editor, {
              type: blocks[index].format,
              children: [{ text: "" }]
            });
            setModal(null);
            setIndex(0);
            break;
          case "Escape":
            event.preventDefault();
            setModal(null);
            break;
        }
      } else {
        const { selection } = editor;
        if (event.key === "/" && selection && Range.isCollapsed(selection)) {
          const { anchor } = selection;
          const block = Editor.above(editor, {
            match: n => Editor.isBlock(editor, n)
          });
          console.log("TCL: block", block);

          const path = block ? block[1] : [];
          const start = Editor.start(editor, path);

          const range = { anchor, focus: start };
          const beforeText = Editor.string(editor, range);

          if (!beforeText) {
            setModal(selection);
          }
        }

        for (const hotkey in HOTKEYS) {
          // TODO: fix types here
          if (isHotkey(hotkey, { byKey: true })(event as any)) {
            event.preventDefault();
            const mark = HOTKEYS[hotkey];
            toggleMark(editor, mark);
          }
        }
      }
    },
    [index, modal]
  );

  React.useEffect(() => {
    if (modal) {
      const el: any = ref.current;
      const domRange = ReactEditor.toDOMRange(editor, modal);
      const rect = domRange.getBoundingClientRect();
      el.style.top = `${rect.top + window.pageYOffset + 24}px`;
      el.style.left = `${rect.left + window.pageXOffset}px`;
    }
  }, [editor, modal]);

  return (
    <React.Fragment>
      <Seo title="Editor | Mintter" />
      <div className="h-screen flex bg-gray-100">
        <Sidebar />
        <div className="flex-1 overflow-y-auto pt-12" ref={wrapperRef}>
          <Container>
            <div className="flex-1">
              <DocumentStatus />
              <Slate
                editor={editor}
                value={value}
                onChange={value => {
                  setValue(value);
                }}
              >
                {
                  <Toolbar
                    className={`bg-gray-900 rounded overflow-hidden py-1 px-2 shadow-xs z-40 text-gray-300 absolute opacity-0 transition transition-opacity duration-500 ease-in-out ${css`
                      transform: translateY(-8px);
                      top: -99999px;
                      left: -999999px;
                    `}`}
                  >
                    <ToolbarButton
                      onClick={e => {
                        e.preventDefault();

                        const node = Editor.nodes(editor, {
                          at: editor.selection
                        });
                        console.log("TCL: node", node);

                        const url = window.prompt("Enter the URL of the link:");
                        if (!url) return;
                        wrapLink(editor, url);
                      }}
                    >
                      Link
                    </ToolbarButton>

                    <ToolbarButton
                      onClick={e => {
                        e.preventDefault();
                        unwrapLink(editor);
                      }}
                    >
                      UnLink
                    </ToolbarButton>
                  </Toolbar>
                }
                <div
                  className={`${css`
                    word-break: break-word;
                  `}`}
                >
                  <div
                    className={`mb-6 pb-6 relative ${css`
                      &:after {
                        content: "";
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        width: 40%;
                        max-width: 300px;
                        height: 2px;
                        z-index: 20;
                        background-color: #222;
                      }
                    `}`}
                  >
                    <Textarea
                      value={title}
                      onChange={t => setTitle(t)}
                      placeholder="Let's do this..."
                      className={`text-4xl font-bold leading-10 ${css`
                        min-height: 56px;
                      `}`}
                    />
                    <Textarea
                      value={description}
                      placeholder="What is this document about?"
                      onChange={t => setDescription(t)}
                      className={`text-lg font-light text-gray-700 italic ${css`
                        min-height: 28px;
                      `}`}
                    />
                  </div>
                  <Editable
                    renderElement={renderElement}
                    renderLeaf={renderLeaf}
                    placeholder="Start writing your thoughts..."
                    spellCheck
                    autoFocus
                    onKeyDown={onKeyDown}
                  />
                </div>
                {modal && (
                  <Portal>
                    <div
                      ref={ref}
                      className={`w-full max-w-xs z-30 rounded-sm shadow-md bg-white absolute ${css`
                        top: -9999em;
                        left: -9999em;
                      `}`}
                    >
                      {blocks.map(({ label, format }, i) => (
                        <div
                          onMouseOver={() => {
                            setIndex(i);
                          }}
                          key={format}
                          className={`py-1 px-2 rounded-sm ${
                            i === index ? "bg-blue-200" : "bg-transparent"
                          } ${css`
                            &:hover {
                              cursor: pointer;
                            }
                          `}`}
                          onClick={event => {
                            event.preventDefault();
                            Editor.removeBackslash(editor);
                            Transforms.setNodes(editor, {
                              type: format,
                              children: [{ text: "" }]
                            });

                            const [, path] = Editor.node(
                              editor,
                              editor.selection
                            );

                            const end = Editor.end(editor, path);
                            Transforms.select(editor, end);
                            ReactEditor.focus(editor);
                            setModal(null);
                            setIndex(0);
                          }}
                        >
                          {label}
                        </div>
                      ))}
                    </div>
                  </Portal>
                )}
              </Slate>
              <DebugValue value={{ title, description, value }} />
            </div>
          </Container>
        </div>
      </div>
    </React.Fragment>
  );
}

const toggleBlock = (editor, format) => {
  const isActive = isBlockActive(editor, format);
  const isList = LIST_TYPES.includes(format);

  Transforms.unwrapNodes(editor, {
    match: n => LIST_TYPES.includes(n.type),
    split: true
  });

  Transforms.setNodes(editor, {
    type: isActive ? "paragraph" : isList ? "list-item" : format
  });

  if (!isActive && isList) {
    const block = { type: format, children: [] };
    Transforms.wrapNodes(editor, block);
  }
};

const toggleMark = (editor, format) => {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

const isBlockActive = (editor, format) => {
  const [match] = Array.from(
    Editor.nodes(editor, {
      match: n => n.type === format
    })
  );

  return !!match;
};

const isMarkActive = (editor, format) => {
  const marks = Editor.marks(editor);
  return marks ? marks[format] === true : false;
};

const blocks = [
  {
    label: "Heading 1",
    format: types.HEADING_ONE
  },
  {
    label: "Heading 2",
    format: types.HEADING_TWO
  },
  {
    label: "Heading 3",
    format: types.HEADING_THREE
  },
  {
    label: "Paragraph",
    format: types.PARAGRAPH
  },
  {
    label: "Link",
    format: types.LINK
  },
  {
    label: "Blockquote",
    format: types.BLOCK_QUOTE
  }
];

function ToolbarButton({ onClick, className = "", children, ...props }) {
  return (
    <button className={`py-1 px-3 ${className}`} onClick={onClick} {...props}>
      {children}
    </button>
  );
}
