import { Fragment } from 'react';

function renderInline(text: string, keyPrefix: string): React.ReactNode {
  // 处理 **加粗** 与 `code`
  const parts: React.ReactNode[] = [];
  let buf = '';
  let i = 0;
  let k = 0;
  while (i < text.length) {
    if (text[i] === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end > 0) {
        if (buf) {
          parts.push(buf);
          buf = '';
        }
        parts.push(
          <strong key={`${keyPrefix}-b-${k++}`}>{text.slice(i + 2, end)}</strong>,
        );
        i = end + 2;
        continue;
      }
    }
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end > 0) {
        if (buf) {
          parts.push(buf);
          buf = '';
        }
        parts.push(
          <code
            key={`${keyPrefix}-c-${k++}`}
            className="rounded bg-muted px-1 py-0.5 font-mono text-[12.5px]"
          >
            {text.slice(i + 1, end)}
          </code>,
        );
        i = end + 1;
        continue;
      }
    }
    buf += text[i];
    i += 1;
  }
  if (buf) parts.push(buf);
  return parts.map((p, idx) => <Fragment key={`${keyPrefix}-f-${idx}`}>{p}</Fragment>);
}

export function SimpleMarkdown({ source }: { source: string }): React.JSX.Element {
  if (!source) return <></>;
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const out: React.ReactNode[] = [];
  let listBuf: string[] = [];

  const flushList = (key: string): void => {
    if (!listBuf.length) return;
    out.push(
      <ul key={`ul-${key}`} className="list-disc space-y-1 pl-5">
        {listBuf.map((it, i) => (
          <li key={i}>{renderInline(it, `${key}-${i}`)}</li>
        ))}
      </ul>,
    );
    listBuf = [];
  };

  let paraBuf: string[] = [];
  const flushPara = (key: string): void => {
    if (!paraBuf.length) return;
    out.push(
      <p key={`p-${key}`} className="text-pretty leading-relaxed">
        {renderInline(paraBuf.join(' '), `p-${key}`)}
      </p>,
    );
    paraBuf = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const line = raw.trimEnd();

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      flushPara(`b${i}`);
      listBuf.push(bullet[1]);
      continue;
    }

    if (!line.trim()) {
      flushList(`s${i}`);
      flushPara(`s${i}`);
      continue;
    }

    flushList(`m${i}`);
    paraBuf.push(line);
  }

  flushList('end');
  flushPara('end');

  return <div className="space-y-3 text-sm text-foreground/90">{out}</div>;
}
