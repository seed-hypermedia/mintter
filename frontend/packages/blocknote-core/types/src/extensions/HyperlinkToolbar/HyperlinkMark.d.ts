import { HyperlinkToolbarPluginProps } from "./HyperlinkToolbarPlugin";
/**
 * This custom link includes a special menu for editing/deleting/opening the link.
 * The menu will be triggered by hovering over the link with the mouse,
 * or by moving the cursor inside the link text
 */
declare const Hyperlink: import("@tiptap/core").Mark<HyperlinkToolbarPluginProps, any>;
export default Hyperlink;
