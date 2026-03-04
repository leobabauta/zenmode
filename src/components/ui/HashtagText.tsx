import { usePlannerStore } from '../../store/usePlannerStore';

interface HashtagTextProps {
  text: string;
  onHashtagClick: (tag: string) => void;
  className?: string;
}

const URL_RE = /https?:\/\/[^\s)>\]]+/;
const HASHTAG_RE = /#[\w-]+/;
const SPLIT_RE = new RegExp(`(${URL_RE.source}|${HASHTAG_RE.source})`, 'g');

function ColoredHashtag({ tag, onClick }: { tag: string; onClick: () => void }) {
  const color = usePlannerStore((s) => s.getLabelColor)(tag.toLowerCase());
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="hover:underline cursor-pointer"
      style={{ color }}
    >
      {tag}
    </button>
  );
}

export function HashtagText({ text, onHashtagClick, className }: HashtagTextProps) {
  const parts = text.split(SPLIT_RE);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        /^#[\w-]+$/.test(part) ? (
          <ColoredHashtag key={i} tag={part} onClick={() => onHashtagClick(part)} />
        ) : URL_RE.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="underline text-[var(--color-text-primary)] hover:text-blue-400 cursor-pointer"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}
