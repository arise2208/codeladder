import React, { useState } from 'react';
import { Copy, Check, Info, Lightbulb, AlertTriangle, ShieldAlert, Quote } from 'lucide-react';

// Formats inline markdown elements (bold, italic, code, links, math, strikethrough)
function renderInline(text) {
  if (!text) return null;

  // Split on inline patterns: code `...`, bold **...**, italic *...*, math $...$, links [text](url), strikethrough ~~...~~
  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // 1. Inline code: `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#ffa116] font-mono text-[13px] border border-[#383838]">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // 2. Bold: **text** or __text__
    const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
    if (boldMatch) {
      parts.push(<strong key={key++} className="font-bold text-[#eff2f6]">{renderInline(boldMatch[2])}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // 3. Italic: *text* or _text_
    const italicMatch = remaining.match(/^(\*|_)(.*?)\1/);
    if (italicMatch && !italicMatch[2].startsWith(' ')) {
      parts.push(<em key={key++} className="italic text-gray-300">{renderInline(italicMatch[2])}</em>);
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // 4. Strikethrough: ~~text~~
    const strikeMatch = remaining.match(/^~~(.*?)~~/);
    if (strikeMatch) {
      parts.push(<del key={key++} className="line-through text-gray-500">{renderInline(strikeMatch[1])}</del>);
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }

    // 5. Inline math: $formula$
    const mathMatch = remaining.match(/^\$([^$]+)\$/);
    if (mathMatch) {
      parts.push(
        <span key={key++} className="px-1 py-0.5 rounded bg-[#6C5CE7]/15 text-[#A29BFE] font-mono text-[13px] border border-[#6C5CE7]/30">
          {mathMatch[1]}
        </span>
      );
      remaining = remaining.slice(mathMatch[0].length);
      continue;
    }

    // 6. Links: [text](url)
    const linkMatch = remaining.match(/^\[(.*?)\]\((.*?)\)/);
    if (linkMatch) {
      const href = linkMatch[2];
      const isExternal = href.startsWith('http');
      parts.push(
        <a
          key={key++}
          href={href}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="text-[#ffa116] hover:underline font-medium"
        >
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Regular text up to next special character
    const nextSpecialIndex = remaining.search(/[`*_$~\[]/);
    if (nextSpecialIndex === -1) {
      parts.push(remaining);
      break;
    } else if (nextSpecialIndex === 0) {
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      parts.push(remaining.slice(0, nextSpecialIndex));
      remaining = remaining.slice(nextSpecialIndex);
    }
  }

  return parts;
}

function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-gray-800 bg-[#16171D] text-gray-100 shadow-md">
      <div className="flex items-center justify-between px-4 py-2 bg-[#20222A] border-b border-gray-800/80 text-xs text-gray-400">
        <span className="font-mono uppercase font-bold tracking-wider text-[11px] text-[#A29BFE]">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white px-2 py-0.5 rounded hover:bg-white/10 transition-all cursor-pointer"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check size={13} className="text-emerald-400" />
              <span className="text-emerald-400 font-semibold text-[11px]">Copied</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span className="text-[11px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[13px] font-mono leading-relaxed text-gray-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function NotionRenderer({ content }) {
  if (!content) return null;

  // Split into lines
  const lines = content.split(/\r?\n/);
  const elements = [];
  let inCodeBlock = false;
  let codeBuffer = [];
  let codeLanguage = '';
  let inList = false;
  let listItems = [];
  let listType = 'ul';

  const flushList = () => {
    if (listItems.length > 0) {
      if (listType === 'ol') {
        elements.push(
          <ol key={`ol-${elements.length}`} className="my-3 pl-6 space-y-1.5 list-decimal text-gray-300 text-[15px] leading-relaxed">
            {listItems.map((item, idx) => <li key={idx}>{renderInline(item)}</li>)}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="my-3 pl-6 space-y-1.5 list-disc text-gray-300 text-[15px] leading-relaxed">
            {listItems.map((item, idx) => <li key={idx}>{renderInline(item)}</li>)}
          </ul>
        );
      }
      listItems = [];
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check code blocks ```lang
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        flushList();
        inCodeBlock = true;
        codeLanguage = line.trim().slice(3).trim();
        codeBuffer = [];
      } else {
        elements.push(
          <CodeBlock
            key={`code-${elements.length}`}
            code={codeBuffer.join('\n')}
            language={codeLanguage}
          />
        );
        inCodeBlock = false;
        codeBuffer = [];
        codeLanguage = '';
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Display Math Formula: $$ ... $$
    if (line.trim().startsWith('$$') && line.trim().endsWith('$$') && line.trim().length > 4) {
      flushList();
      const formula = line.trim().slice(2, -2).trim();
      elements.push(
        <div key={`math-${elements.length}`} className="my-4 p-4 text-center bg-[#1a1a1a] rounded-xl border border-[#383838] font-mono text-[#A29BFE] text-sm overflow-x-auto shadow-xs">
          {formula}
        </div>
      );
      continue;
    }

    // Horizontal Rule: --- or ***
    if (/^(\s*[-*_]\s*){3,}$/.test(line)) {
      flushList();
      elements.push(<hr key={`hr-${elements.length}`} className="my-6 border-[#383838]" />);
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      flushList();
      const rawText = line.slice(2).trim();
      const headingId = rawText.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      elements.push(
        <h1 id={headingId} key={`h1-${elements.length}`} className="text-2xl sm:text-3xl font-black text-[#eff2f6] mt-7 mb-3 tracking-tight border-b border-[#383838] pb-2 scroll-mt-20">
          {renderInline(rawText)}
        </h1>
      );
      continue;
    }

    if (line.startsWith('## ')) {
      flushList();
      const rawText = line.slice(3).trim();
      const headingId = rawText.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      elements.push(
        <h2 id={headingId} key={`h2-${elements.length}`} className="text-xl sm:text-2xl font-bold text-[#eff2f6] mt-6 mb-2.5 tracking-tight scroll-mt-20">
          {renderInline(rawText)}
        </h2>
      );
      continue;
    }

    if (line.startsWith('### ')) {
      flushList();
      const rawText = line.slice(4).trim();
      const headingId = rawText.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      elements.push(
        <h3 id={headingId} key={`h3-${elements.length}`} className="text-lg font-bold text-[#eff2f6] mt-5 mb-2 scroll-mt-20">
          {renderInline(rawText)}
        </h3>
      );
      continue;
    }

    // Callout / Alerts: > [!NOTE], > [!TIP], > [!WARNING], > [!IMPORTANT]
    if (line.startsWith('> [!')) {
      flushList();
      const alertTypeMatch = line.match(/^>\s*\[!([A-Z]+)\]/);
      const alertType = alertTypeMatch ? alertTypeMatch[1] : 'NOTE';
      
      // Collect subsequent quoted lines
      const alertLines = [];
      while (i + 1 < lines.length && lines[i + 1].startsWith('>')) {
        i++;
        alertLines.push(lines[i].replace(/^>\s*/, ''));
      }

      let icon = <Info size={16} className="text-blue-400" />;
      let style = 'bg-blue-950/40 border-blue-800/60 text-blue-200';

      if (alertType === 'TIP') {
        icon = <Lightbulb size={16} className="text-emerald-400" />;
        style = 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200';
      } else if (alertType === 'WARNING') {
        icon = <AlertTriangle size={16} className="text-amber-400" />;
        style = 'bg-amber-950/40 border-amber-800/60 text-amber-200';
      } else if (alertType === 'IMPORTANT' || alertType === 'CAUTION') {
        icon = <ShieldAlert size={16} className="text-rose-400" />;
        style = 'bg-rose-950/40 border-rose-800/60 text-rose-200';
      }

      elements.push(
        <div key={`alert-${elements.length}`} className={`my-4 p-4 rounded-xl border ${style} space-y-1 shadow-xs`}>
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
            {icon}
            <span>{alertType}</span>
          </div>
          <div className="text-[14px] leading-relaxed">
            {renderInline(alertLines.join(' '))}
          </div>
        </div>
      );
      continue;
    }

    // Standard Blockquote: > quote
    if (line.startsWith('>')) {
      flushList();
      const quoteText = line.replace(/^>\s*/, '');
      elements.push(
        <blockquote key={`quote-${elements.length}`} className="my-3 pl-4 border-l-3 border-[#ffa116] italic text-gray-300 text-[15px] bg-[#ffa116]/5 py-1.5 rounded-r-lg">
          {renderInline(quoteText)}
        </blockquote>
      );
      continue;
    }

    // Unordered List: - item or * item
    if (/^\s*[-*]\s+/.test(line)) {
      if (!inList || listType !== 'ul') {
        flushList();
        inList = true;
        listType = 'ul';
      }
      listItems.push(line.replace(/^\s*[-*]\s+/, ''));
      continue;
    }

    // Ordered List: 1. item
    if (/^\s*\d+\.\s+/.test(line)) {
      if (!inList || listType !== 'ol') {
        flushList();
        inList = true;
        listType = 'ol';
      }
      listItems.push(line.replace(/^\s*\d+\.\s+/, ''));
      continue;
    }

    // Empty line
    if (!line.trim()) {
      flushList();
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={`p-${elements.length}`} className="my-2.5 text-gray-300 text-[15px] leading-relaxed">
        {renderInline(line)}
      </p>
    );
  }

  flushList();

  return (
    <article className="notion-article max-w-none font-sans text-[#eff2f6]">
      {elements}
    </article>
  );
}
