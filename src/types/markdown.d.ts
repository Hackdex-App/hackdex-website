declare module "react-markdown" {
  import * as React from "react";
  export interface ReactMarkdownProps {
    children?: React.ReactNode;
    remarkPlugins?: any[];
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


