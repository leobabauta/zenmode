interface HashtagTextProps {
  text: string;
  onHashtagClick: (tag: string) => void;
  className?: string;
}

const URL_RE = /https?:\/\/[^\s)>\]]+/;
const HASHTAG_RE = /#[\w-]+/;
const SPLIT_RE = new RegExp(`(${URL_RE.source}|${HASHTAG_RE.source})`, 'g');

export function HashtagText({ text, onHashtagClick, className }: HashtagTextProps) {
  const parts = text.split(SPLIT_RE);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        /^#[\w-]+$/.test(part) ? (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onHashtagClick(part);
            }}
            className="text-blue-400 hover:text-blue-500 hover:underline cursor-pointer"
          >
            {part}
          </button>
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
