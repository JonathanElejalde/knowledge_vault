import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from './Button';
import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  variant?: 'default' | 'compact' | 'preview';
}

// Custom hook for copy functionality
const useCopyToClipboard = () => {
  const [copied, setCopied] = React.useState(false);

  const copy = React.useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }, []);

  return { copied, copy };
};

// Simple theme detection
const useThemeDetection = () => {
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    const checkTheme = () => {
      const isDarkMode = document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(isDarkMode);
    };

    checkTheme();
    
    // Listen for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkTheme);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkTheme);
    };
  }, []);

  return isDark;
};

// Code block component with copy functionality
const CodeBlock: React.FC<{
  className?: string;
  children: React.ReactNode;
  inline?: boolean;
}> = ({ className, children, inline }) => {
  const { copy, copied } = useCopyToClipboard();
  const isDark = useThemeDetection();
  
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const codeString = String(children).replace(/\n$/, '');

  // Inline code
  if (inline || !match) {
    return (
      <code className="bg-muted text-primary px-1.5 py-0.5 rounded-md text-sm font-mono border">
        {children}
      </code>
    );
  }

  // Block code with syntax highlighting
  return (
    <div className="relative group my-4">
      <div className="flex items-center justify-between bg-muted/50 px-4 py-2 border-t border-l border-r rounded-t-lg">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {language || 'code'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => copy(codeString)}
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
      <SyntaxHighlighter
        style={isDark ? oneDark : oneLight}
        language={language}
        PreTag="div"
        className="!mt-0 !rounded-t-none border-b border-l border-r rounded-b-lg"
        customStyle={{
          margin: 0,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
        }}
      >
        {codeString}
      </SyntaxHighlighter>
    </div>
  );
};

// Custom link component
const CustomLink: React.FC<{
  href?: string;
  children: React.ReactNode;
}> = ({ href, children }) => {
  const isExternal = href?.startsWith('http');
  
  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="text-primary hover:text-primary/80 underline underline-offset-2 decoration-primary/30 hover:decoration-primary/60 transition-colors inline-flex items-center gap-1"
    >
      {children}
      {isExternal && <ExternalLink className="h-3 w-3" />}
    </a>
  );
};

// Custom table components
const CustomTable: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="my-6 overflow-x-auto">
    <table className="w-full border-collapse border border-border rounded-lg overflow-hidden">
      {children}
    </table>
  </div>
);

const CustomTableHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <thead className="bg-muted/50">
    {children}
  </thead>
);

const CustomTableRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tr className="border-b border-border hover:bg-muted/30 transition-colors">
    {children}
  </tr>
);

const CustomTableCell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <td className="px-4 py-3 text-left">
    {children}
  </td>
);

const CustomTableHeaderCell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th className="px-4 py-3 text-left font-semibold text-foreground">
    {children}
  </th>
);

// Custom blockquote
const CustomBlockquote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <blockquote className="border-l-4 border-primary/30 pl-4 py-2 my-4 bg-muted/30 rounded-r-lg italic text-muted-foreground">
    {children}
  </blockquote>
);

// Custom list components
const CustomOrderedList: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ol className="list-decimal list-inside space-y-1 my-4 ml-4">
    {children}
  </ol>
);

const CustomUnorderedList: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ul className="list-disc list-inside space-y-1 my-4 ml-4">
    {children}
  </ul>
);

const CustomListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="leading-relaxed">
    {children}
  </li>
);

export function MarkdownRenderer({ content, className, variant = 'default' }: MarkdownRendererProps) {
  const baseClasses = cn(
    "prose prose-slate dark:prose-invert max-w-none",
    {
      'prose-sm': variant === 'compact',
      'prose-lg': variant === 'default',
      'prose-base': variant === 'preview',
    },
    className
  );

  const components: Components = {
    // Headings with better styling
    h1: ({ children, ...props }) => (
      <h1 className="text-3xl font-bold my-6 pb-3 border-b border-border" {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2 className="text-2xl font-semibold my-5 pb-2 border-b border-border/50" {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 className="text-xl font-semibold my-4" {...props}>
        {children}
      </h3>
    ),
    h4: ({ children, ...props }) => (
      <h4 className="text-lg font-semibold my-3" {...props}>
        {children}
      </h4>
    ),
    h5: ({ children, ...props }) => (
      <h5 className="text-base font-semibold my-2" {...props}>
        {children}
      </h5>
    ),
    h6: ({ children, ...props }) => (
      <h6 className="text-sm font-semibold my-2 text-muted-foreground" {...props}>
        {children}
      </h6>
    ),

    // Paragraphs
    p: ({ children, ...props }) => (
      <p className="leading-relaxed my-4 text-foreground" {...props}>
        {children}
      </p>
    ),

    // Code blocks and inline code
    code: ({ node, className, children, ...props }) => {
      const inline = !className?.includes('language-');
      return (
        <CodeBlock className={className} inline={inline} {...props}>
          {children}
        </CodeBlock>
      );
    },

    // Links
    a: ({ href, children, ...props }) => {
      const isExternal = href?.startsWith('http');
      
      return (
        <a
          href={href}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="text-primary hover:text-primary/80 underline underline-offset-2 decoration-primary/30 hover:decoration-primary/60 transition-colors inline-flex items-center gap-1"
          {...props}
        >
          {children}
          {isExternal && <ExternalLink className="h-3 w-3" />}
        </a>
      );
    },

    // Tables
    table: ({ children, ...props }) => (
      <div className="my-6 overflow-x-auto">
        <table className="w-full border-collapse border border-border rounded-lg overflow-hidden" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }) => (
      <thead className="bg-muted/50" {...props}>
        {children}
      </thead>
    ),
    tbody: ({ children, ...props }) => <tbody {...props}>{children}</tbody>,
    tr: ({ children, ...props }) => (
      <tr className="border-b border-border hover:bg-muted/30 transition-colors" {...props}>
        {children}
      </tr>
    ),
    td: ({ children, ...props }) => (
      <td className="px-4 py-3 text-left" {...props}>
        {children}
      </td>
    ),
    th: ({ children, ...props }) => (
      <th className="px-4 py-3 text-left font-semibold text-foreground" {...props}>
        {children}
      </th>
    ),

    // Blockquotes
    blockquote: ({ children, ...props }) => (
      <blockquote className="border-l-4 border-primary/30 pl-4 py-2 my-4 bg-muted/30 rounded-r-lg italic text-muted-foreground" {...props}>
        {children}
      </blockquote>
    ),

    // Lists
    ol: ({ children, ...props }) => (
      <ol className="list-decimal list-inside space-y-1 my-4 ml-4" {...props}>
        {children}
      </ol>
    ),
    ul: ({ children, ...props }) => (
      <ul className="list-disc list-inside space-y-1 my-4 ml-4" {...props}>
        {children}
      </ul>
    ),
    li: ({ children, ...props }) => (
      <li className="leading-relaxed" {...props}>
        {children}
      </li>
    ),

    // Horizontal rule
    hr: ({ ...props }) => (
      <hr className="my-8 border-border" {...props} />
    ),

    // Images with better styling
    img: ({ src, alt, ...props }) => (
      <div className="my-6 text-center">
        <img
          src={src}
          alt={alt}
          className="max-w-full h-auto rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow"
          loading="lazy"
          {...props}
        />
        {alt && (
          <p className="text-sm text-muted-foreground mt-2 italic">{alt}</p>
        )}
      </div>
    ),

    // Strong and emphasis
    strong: ({ children, ...props }) => (
      <strong className="font-semibold text-foreground" {...props}>
        {children}
      </strong>
    ),
    em: ({ children, ...props }) => (
      <em className="italic text-foreground" {...props}>
        {children}
      </em>
    ),
  };

  return (
    <div className={baseClasses}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
} 