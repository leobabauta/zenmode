import type { ReactNode } from 'react';

/** Render inline formatting: bold, italic, inline code, links */
function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  // Match: **bold**, *italic*, `code`, [text](url)
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={key++}>{match[3]}</em>);
    } else if (match[4]) {
      parts.push(
        <code key={key++} className="px-1 py-0.5 rounded bg-[var(--color-surface)] text-xs font-mono">
          {match[4]}
        </code>
      );
    } else if (match[5] && match[6]) {
      parts.push(
        <a key={key++} href={match[6]} target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent)] underline">
          {match[5]}
        </a>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : [text];
}

interface SimpleMarkdownProps {
  text: string;
  className?: string;
}

export function SimpleMarkdown({ text, className = '' }: SimpleMarkdownProps) {
  const lines = text.split('\n');
  const elements: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Headings
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const Tag = level === 1 ? 'h3' : level === 2 ? 'h4' : 'h5';
      const size = level === 1 ? 'text-base font-semibold' : level === 2 ? 'text-sm font-semibold' : 'text-sm font-medium';
      elements.push(
        <Tag key={i} className={`${size} text-[var(--color-text-primary)] mt-2 mb-1`}>
          {renderInline(content)}
        </Tag>
      );
      i++;
      continue;
    }

    // Unordered list items: *, -, +
    if (/^[\s]*[-*+]\s/.test(line)) {
      const listItems: ReactNode[] = [];
      while (i < lines.length && /^[\s]*[-*+]\s/.test(lines[i])) {
        const itemText = lines[i].replace(/^[\s]*[-*+]\s/, '');
        listItems.push(<li key={i}>{renderInline(itemText)}</li>);
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-0.5 my-1">
          {listItems}
        </ul>
      );
      continue;
    }

    // Ordered list items: 1. 2. etc
    if (/^[\s]*\d+[.)]\s/.test(line)) {
      const listItems: ReactNode[] = [];
      while (i < lines.length && /^[\s]*\d+[.)]\s/.test(lines[i])) {
        const itemText = lines[i].replace(/^[\s]*\d+[.)]\s/, '');
        listItems.push(<li key={i}>{renderInline(itemText)}</li>);
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-0.5 my-1">
          {listItems}
        </ol>
      );
      continue;
    }

    // Empty line = spacing
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="my-0.5">{renderInline(line)}</p>
    );
    i++;
  }

  return (
    <div className={`text-sm text-[var(--color-text-secondary)] break-words ${className}`}>
      {elements}
    </div>
  );
}
