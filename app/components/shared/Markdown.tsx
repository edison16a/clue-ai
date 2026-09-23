import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders model output as Markdown.
 *
 * The plugin array is hoisted to a module constant because react-markdown
 * compares it by identity: a fresh `[remarkGfm]` literal on every render
 * rebuilds the processor pipeline each time, which the original did in both
 * places it rendered Markdown.
 *
 * GFM is enabled because the help prompt asks for bullet lists and the model
 * routinely replies with tables and fenced code, none of which base Markdown
 * covers.
 */
const REMARK_PLUGINS = [remarkGfm];

export function Markdown({ children }: { children: string }) {
  return <ReactMarkdown remarkPlugins={REMARK_PLUGINS}>{children}</ReactMarkdown>;
}
