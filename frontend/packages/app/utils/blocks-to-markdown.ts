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
  const childrenHtml = block.children
    ? block.children.map(convertBlockToHtml).join('\n')
    : ''

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
    case 'list':
      if (block.props.childrenType === 'ul') {
        return `<ul>${block.children
          .map((child) => `<li>${convertBlockToHtml(child)}</li>`)
          .join('\n')}</ul>\n${childrenHtml}`
      } else if (block.props.childrenType === 'ol') {
        return `<ol start="${block.props.start}">${block.children
          .map((child) => `<li>${convertBlockToHtml(child)}</li>`)
          .join('\n')}</ol>\n${childrenHtml}`
      }
      return ''
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
  console.log(htmlContent)
  return htmlContent
}

async function extractMediaFiles(blocks) {
  const mediaFiles: {url: string; filename: string}[] = []
  const extractMedia = async (block) => {
    if (
      block.type === 'image' ||
      block.type === 'video' ||
      block.type === 'file'
    ) {
      const url = block.props.url
      const filename = url.split('/').pop()
      mediaFiles.push({url, filename})
      block.props = {...block.props, url: `media/${filename}`} // Update the URL to point to the local media folder
    }
    if (block.children) {
      for (const child of block.children) {
        await extractMedia(child)
      }
    }
  }
  for (const block of blocks) {
    await extractMedia(block)
  }
  return mediaFiles
}

export async function convertBlocksToMarkdown(blocks: HMBlock[]) {
  const mediaFiles = await extractMediaFiles(blocks) // Extract media files and update URLs first
  const markdownFile = await unified()
    .use(rehypeParse, {fragment: true})
    .use(rehypeRemark)
    .use(remarkGfm)
    .use(remarkStringify)
    .process(convertBlocksToHtml(blocks))
  const markdownContent = markdownFile.value as string
  return {markdownContent, mediaFiles}
}
