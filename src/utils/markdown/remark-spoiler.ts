import { visit } from "unist-util-visit";
import type { Root, Text } from "mdast";

type SpoilerNode = {
  type: "spoiler";
  children: Text[];
};

export default function remarkSpoiler() {
  return (tree: Root) => {
    // Collect all modifications first
    const modifications: Array<{
      parent: any;
      index: number;
      replacement: (Text | SpoilerNode)[];
    }> = [];

    visit(tree, (node, index, parent) => {
      // Skip code blocks and code spans - don't process spoilers inside code
      if (node.type === "code" || node.type === "inlineCode") {
        return;
      }

      // Process text nodes
      if (node.type === "text" && parent && typeof index === "number") {
        const textNode = node as Text;
        const text = textNode.value;
        const spoilerRegex = /\|\|([^|]+)\|\|/g;

        let match;
        let lastIndex = 0;
        const newNodes: (Text | SpoilerNode)[] = [];
        let hasSpoilers = false;

        while ((match = spoilerRegex.exec(text)) !== null) {
          hasSpoilers = true;
          // Add text before the spoiler
          if (match.index > lastIndex) {
            newNodes.push({
              type: "text",
              value: text.slice(lastIndex, match.index),
            } as Text);
          }

          // Add the spoiler node with data to help mdast-to-hast conversion
          // The spoiler node contains a text node as a child so the content is preserved
          newNodes.push({
            type: "spoiler",
            children: [
              {
                type: "text",
                value: match[1],
              } as Text,
            ],
            data: {
              hName: "span",
              hProperties: {
                className: "markdown-spoiler",
              },
            },
          } as SpoilerNode & { data?: { hName: string; hProperties: Record<string, string> } });

          lastIndex = spoilerRegex.lastIndex;
        }

        // Add remaining text after the last spoiler
        if (lastIndex < text.length) {
          newNodes.push({
            type: "text",
            value: text.slice(lastIndex),
          } as Text);
        }

        // Store modification if we found spoilers
        if (hasSpoilers) {
          modifications.push({
            parent,
            index,
            replacement: newNodes,
          });
        }
      }
    });

    // Apply modifications in reverse order to maintain indices
    modifications.reverse().forEach(({ parent, index, replacement }) => {
      parent.children.splice(index, 1, ...replacement);
    });
  };
}

