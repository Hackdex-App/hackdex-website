declare module "react-markdown" {
  import * as React from "react";
  export interface ReactMarkdownProps {
    children?: React.ReactNode;
    remarkPlugins?: any[];
    rehypePlugins?: any[];
    className?: string;
    [key: string]: any;
  }
  const ReactMarkdown: React.FC<ReactMarkdownProps>;
  export default ReactMarkdown;
}

declare module "remark-gfm" {
  const remarkGfm: any;
  export default remarkGfm;
}

declare module "rehype-slug" {
  const rehypeSlug: any;
  export default rehypeSlug;
}

declare module "*.md" {
  const content: string;
  export default content;
}

