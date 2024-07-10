import {HMBlock} from '@mintter/shared'
import rehypeParse from 'rehype-parse'
import rehypeRemark from 'rehype-remark'
import remarkGfm from 'remark-gfm'
import remarkStringify from 'remark-stringify'
import {unified} from 'unified'

function applyStyles(text, styles) {
  if (styles.bold) text = `<strong>${text}</strong>`
  if (styles.italic) text = `<em>${text}</em>`
  if (styles.strike) text = `<del>${text}</del>`
  if (styles.underline) text = `<u>${text}</u>`
  return text
}

function convertContentItemToHtml(contentItem) {
  let text = contentItem.text || ''
  const {styles = {}} = contentItem

  text = applyStyles(text, styles)

  if (contentItem.type === 'link') {
    const linkText = applyStyles(
      contentItem.content[0].text,
      contentItem.content[0].styles || {},
    )
    return `<a href="${contentItem.href}">${linkText}</a>`
  } else {
    return text
  }
}

function convertBlockToHtml(block) {
  let childrenHtml = ''
  if (block.children) {
    const childrenContent = block.children.map(convertBlockToHtml).join('\n')
    if (block.props.childrenType === 'ul') {
      childrenHtml = `<ul>${childrenContent}</ul>`
    } else if (block.props.childrenType === 'ol') {
      childrenHtml = `<ol start="${
        block.props.start || 1
      }">${childrenContent}</ol>`
    } else {
      childrenHtml = childrenContent
    }
  }

  switch (block.type) {
    case 'heading':
      return `<h${block.props.level}>${block.content
        .map(convertContentItemToHtml)
        .join('')}</h${block.props.level}>\n${childrenHtml}`
    case 'paragraph':
      return `<p>${block.content
        .map(convertContentItemToHtml)
        .join('')}</p>\n${childrenHtml}`
    case 'image':
      return `<img src="${block.props.url}" alt="${block.content
        .map((contentItem) => contentItem.text)
        .join('')}" title="${block.props.name}">\n${childrenHtml}`
    case 'codeBlock':
      return `<pre><code class="language-${
        block.props.language || 'plaintext'
      }">${block.content
        .map((contentItem) => contentItem.text)
        .join('\n')}</code></pre>\n${childrenHtml}`
    case 'video':
      return `<p>![${block.props.name}](${block.props.url} "width=${block.props.width}")</p>\n${childrenHtml}`
    case 'file':
      return `<p>[${block.props.name}](${block.props.url} "size=${block.props.size}")</p>\n${childrenHtml}`
    default:
      return block.content
        ? block.content.map(convertContentItemToHtml).join('') +
            `\n${childrenHtml}`
        : childrenHtml
  }
}

function convertBlocksToHtml(blocks) {
  const htmlContent: string = blocks
    .map((block) => convertBlockToHtml(block))
    .join('\n\n')
  return htmlContent
}

export async function convertBlocksToMarkdown(blocks: HMBlock[]) {
  const markdownFile = await unified()
    .use(rehypeParse, {fragment: true})
    .use(rehypeRemark)
    .use(remarkGfm)
    .use(remarkStringify)
    .process(convertBlocksToHtml(blocks))
  return markdownFile.value as string
}
