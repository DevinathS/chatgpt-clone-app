import { Box, Link, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { Children, isValidElement, memo, type ReactNode } from 'react';
import Markdown, { type Components } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import 'highlight.js/styles/github-dark.css';
import { surface } from '../theme';
import CopyButton from './CopyButton';

/** Flattens syntax-highlighted React nodes back to plain text (for the copy button). */
function nodeText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return '';
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const child = Children.toArray(children)[0];
  let lang = '';
  let text = '';
  if (isValidElement<{ className?: string; children?: ReactNode }>(child)) {
    lang = /language-([\w-]+)/.exec(child.props.className ?? '')?.[1] ?? '';
    text = nodeText(child.props.children).replace(/\n$/, '');
  }
  return (
    <Box sx={{ my: 2, borderRadius: 3, overflow: 'hidden', bgcolor: surface('code') }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pl: 2,
          pr: 1,
          py: 0.25,
          bgcolor: surface('codeHeader'),
          color: '#b4b4b4',
          fontSize: 12,
        }}
      >
        <span>{lang || 'code'}</span>
        <CopyButton text={text} variant="text" label="Copy code" />
      </Box>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 2,
          overflowX: 'auto',
          fontSize: 13.5,
          lineHeight: 1.6,
          '& code': { fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
          '& code.hljs': { background: 'transparent', padding: 0 },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

const components: Components = {
  a: ({ href, children }) => (
    <Link href={href} target="_blank" rel="noopener noreferrer" underline="always">
      {children}
    </Link>
  ),
  img: ({ src, alt }) => (
    <Box
      component="img"
      src={typeof src === 'string' ? src : undefined}
      alt={alt ?? ''}
      loading="lazy"
      sx={{ display: 'block', maxWidth: '100%', height: 'auto', borderRadius: 3, my: 1.5 }}
    />
  ),
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
  table: ({ children }) => (
    <TableContainer component={Paper} variant="outlined" sx={{ my: 2, borderRadius: 3 }}>
      <Table size="small">{children}</Table>
    </TableContainer>
  ),
  thead: ({ children }) => <TableHead>{children}</TableHead>,
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => <TableRow>{children}</TableRow>,
  th: ({ children }) => (
    <TableCell component="th" scope="col" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
      {children}
    </TableCell>
  ),
  td: ({ children }) => <TableCell>{children}</TableCell>,
};

const markdownSx = {
  fontSize: '1rem',
  lineHeight: 1.75,
  wordBreak: 'break-word',
  '& > :first-of-type': { mt: 0 },
  '& > :last-child': { mb: 0 },
  '& p': { my: 1.5 },
  '& ul, & ol': { pl: 3, my: 1.5 },
  '& li': { my: 0.5 },
  '& li > ul, & li > ol': { my: 0.5 },
  '& li input[type="checkbox"]': { mr: 1 },
  '& h1, & h2, & h3, & h4': { lineHeight: 1.3, mt: 3, mb: 1, fontWeight: 600 },
  '& h1': { fontSize: '1.6rem' },
  '& h2': { fontSize: '1.35rem' },
  '& h3': { fontSize: '1.15rem' },
  '& blockquote': {
    m: 0,
    my: 1.5,
    pl: 2,
    borderLeft: 3,
    borderColor: 'divider',
    color: 'text.secondary',
  },
  '& hr': { border: 0, borderTop: 1, borderColor: 'divider', my: 3 },
  '& :not(pre) > code': {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: '0.875em',
    px: 0.75,
    py: 0.25,
    borderRadius: 1.5,
    bgcolor: surface('bubble'),
  },
} as const;

function MarkdownRenderer({ content }: { content: string }) {
  return (
    <Box sx={markdownSx}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }]]}
        components={components}
      >
        {content}
      </Markdown>
    </Box>
  );
}

export default memo(MarkdownRenderer);
