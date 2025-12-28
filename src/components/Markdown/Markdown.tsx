import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import remarkSpoiler from "@/utils/markdown/remark-spoiler";
import Spoiler from "./Spoiler";

interface MarkdownProps {
  children: string;
  className?: string;
  headingLevelOffset?: number;
}

export default function Markdown({
  children,
  headingLevelOffset = 0,
}: MarkdownProps) {
  // Build heading demotion components if offset is provided
  const headingComponents: Record<string, string> = {};
  if (headingLevelOffset > 0) {
    for (let i = 1; i <= 6; i++) {
      const targetLevel = Math.min(i + headingLevelOffset, 6);
      headingComponents[`h${i}`] = `h${targetLevel}`;
    }
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkSpoiler]}
      rehypePlugins={[rehypeSlug]}
      components={{
        ...headingComponents,
        span: ({ node, children, className, ...props }: any) => {
          // Check if this span has the markdown-spoiler class (from our remark plugin)
          if (
            className === "markdown-spoiler" ||
            (Array.isArray(node?.properties?.className) &&
              node.properties.className.includes("markdown-spoiler"))
          ) {
            return <Spoiler>{children}</Spoiler>;
          }
          // Default span rendering
          return <span className={className} {...props}>{children}</span>;
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

