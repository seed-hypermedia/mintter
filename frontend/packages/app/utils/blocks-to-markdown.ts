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

function convertBlockToHtml(block, isListItem = false) {
  let childrenHtml = ''
  if (block.children) {
    const childrenContent = block.children
      .map((child) =>
        convertBlockToHtml(
          child,
          block.props.childrenType === 'ul' ||
            block.props.childrenType === 'ol',
        ),
      )
      .join('\n')
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

  const contentHtml = block.content
    ? block.content.map(convertContentItemToHtml).join('')
    : ''

  const blockHtml = (() => {
    switch (block.type) {
      case 'heading':
        return `<h${block.props.level}>${contentHtml}</h${block.props.level}>`
      case 'paragraph':
        return `<p>${contentHtml}</p>`
      case 'image':
        return `<img src="${block.props.url}" alt="${contentHtml}" title="${block.props.name}">`
      case 'codeBlock':
        return `<pre><code class="language-${
          block.props.language || 'plaintext'
        }">${contentHtml}</code></pre>`
      case 'video':
        return `<p>![${block.props.name}](${block.props.url} "width=${block.props.width}")</p>`
      case 'file':
        return `<p>[${block.props.name}](${block.props.url} "size=${block.props.size}")</p>`
      case 'math' || 'equation':
        return `<p>$$${contentHtml}$$</p>`
      default:
        return contentHtml
    }
  })()

  if (isListItem) {
    // Wrap the block content in <li> if it's a list item
    return `<li>${blockHtml}${childrenHtml}</li>`
  } else {
    // Return the block content and any children it may have
    return `${blockHtml}\n${childrenHtml}`
  }
}

function convertBlocksToHtml(blocks) {
  const htmlContent: string = blocks
    .map((block) => convertBlockToHtml(block))
    .join('\n\n')
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
      if (
        url.includes('youtu.be') ||
        url.includes('youtube') ||
        url.includes('vimeo')
      ) {
        return
      }
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
