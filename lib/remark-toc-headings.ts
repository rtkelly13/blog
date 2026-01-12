import { Parent } from 'unist'
import { visit } from 'unist-util-visit'
import { toString } from 'mdast-util-to-string'

export default function remarkTocHeadings(options) {
  return (tree: Parent) =>
    visit(tree, 'heading', (node: any) => {
      const textContent = toString(node)
      // rehype-slug adds id to the heading node's data.hProperties.id or standard id
      // But this is a remark plugin, running BEFORE rehype.
      // So we might need to rely on what remark-slug (now rehype-slug) does.
      // If we use rehype-slug, the slug generation happens at rehype phase.
      // We can't easily get the slug here in remark phase unless we generate it ourselves.

      // For now, let's try to extract text and url if it exists (e.g. autolinked)
      // But standard headings just have text.
      // The original code tried to find a link.
      
      options.exportRef.push({
        value: textContent,
        url: '#' + (node.data?.hProperties?.id || node.data?.id || textContent.toLowerCase().replace(/\s/g, '-').replace(/[^\w-]/g, '')),
        depth: node.depth,
      })
    })
}
