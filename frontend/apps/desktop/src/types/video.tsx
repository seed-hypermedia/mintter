import { DefaultBlockSchema, defaultProps } from "@app/blocknote-core";
import { createReactBlockSpec, InlineContent, ReactSlashMenuItem } from "@app/blocknote-react";
import { RiVideoAddFill } from "react-icons/ri";

export const VideoBlock = createReactBlockSpec({
    type: "video",
    propSchema: {
      ...defaultProps,
      src: {
        default: "https://via.placeholder.com/1000",
      },
    },
    containsInlineContent: true,
    render: ({ block }) => (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
        }}>
        <video width="100%" controls>
            <source src={block.props.src} type="video/mp4">
            </source>
        </video>
        <InlineContent />
      </div>
    ),
  });

export const insertVideo = new ReactSlashMenuItem<
DefaultBlockSchema & { video: typeof VideoBlock }
>(
"Video",
(editor) => {
  const src: string | null = prompt("Enter video URL");
  editor.insertBlocks(
    [
      {
        type: "video",
        props: {
          src: src || "https://via.placeholder.com/1000",
        },
      },
    ],
    editor.getTextCursorPosition().block,
    "after"
  );
},
["video", "vid", "media"],
"Media",
<RiVideoAddFill />,
"Insert aa video"
);