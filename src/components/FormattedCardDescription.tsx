import React from 'react';

export interface FormattedCardDescriptionProps {
  text?: string;
  variant?: 'modal' | 'gallery' | 'compact' | 'card-slab';
  size?: 'sm' | 'md' | 'lg';
  hideLevelRequirement?: boolean;
  className?: string;
}

interface ParsedSegment {
  type: 'tier_header' | 'effect' | 'summon_cond' | 'passive' | 'requirement' | 'level2_extra';
  label?: string;
  content: string;
}

/**
 * Splits a raw card effect description into organized, harmonious clauses and semantic blocks.
 */
export function parseCardDescriptionSegments(
  rawText?: string,
  options?: { hideLevelRequirement?: boolean; stripTierHeader?: boolean }
): ParsedSegment[] {
  const fallback = 'Guerreiro convocado para lutar pelo reino.';
  if (!rawText || !rawText.trim()) {
    return [{ type: 'effect', content: fallback }];
  }

  let normalized = rawText.trim();

  // 1. Ensure explicit line breaks before major semantic markers
  normalized = normalized
    .replace(/\s*(Lendária\s*\[[^\]]+\]\.?)\s*/gi, '$1\n')
    .replace(/\s*(Condição de Invocação\s*:)/gi, '\n$1')
    .replace(/\s*(Requisito para subir de nível\s*:)/gi, '\n$1')
    .replace(/\s*(Efeito EXTRA (?:de )?nível 2\s*:)/gi, '\n$1')
    .replace(/\s*(Passiva\s*[-:]\s*)/gi, '\n$1');

  // 2. Split by explicit newlines first
  const rawLines = normalized
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const segments: ParsedSegment[] = [];

  for (const line of rawLines) {
    // Check semantic prefixes
    if (/^Lendária\s*\[[^\]]+\]\.?$/i.test(line)) {
      if (!options?.stripTierHeader) {
        segments.push({
          type: 'tier_header',
          content: line.replace(/\.$/, ''),
        });
      }
      continue;
    }

    const reqMatch = line.match(/^Requisito para subir de nível\s*:\s*(.+)$/i);
    if (reqMatch) {
      if (!options?.hideLevelRequirement) {
        segments.push({
          type: 'requirement',
          label: 'Requisito para Nível 2',
          content: reqMatch[1].trim(),
        });
      }
      continue;
    }

    const lvl2Match = line.match(/^Efeito EXTRA (?:de )?nível 2\s*:\s*(.+)$/i);
    if (lvl2Match) {
      // Split multi-sentence level 2 extra effects into clean lines inside the block
      const formattedLvl2 = splitSentencesHarmoniously(lvl2Match[1].trim()).join('\n');
      segments.push({
        type: 'level2_extra',
        label: 'Efeito Extra (Nível 2)',
        content: formattedLvl2,
      });
      continue;
    }

    const condMatch = line.match(/^Condição de Invocação\s*:\s*(.+)$/i);
    if (condMatch) {
      const parts = splitSentencesHarmoniously(condMatch[1].trim());
      segments.push({
        type: 'summon_cond',
        label: 'Condição de Invocação',
        content: parts[0] || condMatch[1].trim(),
      });
      for (let i = 1; i < parts.length; i++) {
        segments.push({
          type: 'effect',
          content: parts[i],
        });
      }
      continue;
    }

    const passiveMatch = line.match(/^Passiva\s*(?:-\s*([^:]+):|:|-)\s*(.+)$/i);
    if (passiveMatch) {
      const passiveName = passiveMatch[1]?.trim();
      const passiveBody = passiveMatch[2].trim();
      segments.push({
        type: 'passive',
        label: passiveName ? `Passiva · ${passiveName}` : 'Passiva',
        content: passiveBody,
      });
      continue;
    }

    // Standard effect line: split multi-sentence walls of text into individual harmonious clauses
    const clauses = splitSentencesHarmoniously(line);
    for (const clause of clauses) {
      if (clause.trim()) {
        segments.push({
          type: 'effect',
          content: clause.trim(),
        });
      }
    }
  }

  return segments.length > 0 ? segments : [{ type: 'effect', content: fallback }];
}

/**
 * Splits a multi-sentence paragraph into clean individual sentences/clauses
 * so each distinct effect or rule sits on its own visual line.
 */
function splitSentencesHarmoniously(text: string): string[] {
  // Split after '. ' or '! ' when followed by an uppercase letter or number
  return text
    .split(/(?<=[.!])\s+(?=[A-ZÀ-Ú0-9"“])/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Highlights important game keywords, conditions, and numeric values inline.
 */
function renderHighlightedText(text: string): React.ReactNode {
  const tokenRegex =
    /(\b(?:OBLITERAÇÃO|OBLITERAR|OBLITERA|EXECUTAR|EXECUTA|O ABSOLUTO|BURACO NEGRO|INFINITO|INFINITA|IMORTAL|CONGELAR|CONGELADO|CONGELA|CRÍTICO|CRITICO|FURTIVIDADE|FURTIVO|ETÉREO|ETÉREA|ETEREO|ETEREA|ELETRIFICADO|ELETRIFICADOS|TENACIDADE|BRAVURA|IMUNIDADE|BARREIRA|REVELAR|REVELAÇÃO|RETORNE|RETORNAR|RETORNO|ENFRENTAR|ATAQUE-DUPLO|ATAQUE DUPLO|ROUBO DE VIDA|CURA|SONO|TORPOR|ENTORPECER|QUEIMADURA|QUEIMAREM|QUEIMA|RESSURREIÇÃO|SILENCIAR|ATORDOA|ALIANÇA ANGIRIS|VIDA MÁXIMA|DOBRO|DOBRA|DOBRAR)\b|∞|[+-]\d+(?:\/[+-]?\d+)?%?|\b\d+%)/gi;

  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    const parts = line.split(tokenRegex);
    return (
      <React.Fragment key={lineIdx}>
        {lineIdx > 0 && <br />}
        {parts.map((part, partIdx) => {
          if (!part) return null;
          const upper = part.toUpperCase();

          // Numeric bonuses / percentages / infinity
          if (/^[+-]\d+(?:\/[+-]?\d+)?%?$/.test(part) || /^\d+%$/.test(part) || /^DOBR(?:O|A|AR)$/i.test(part) || part === '∞' || upper === 'INFINITO' || upper === 'INFINITA' || upper === 'IMORTAL') {
            return (
              <span key={partIdx} className="font-mono font-extrabold text-amber-300">
                {part}
              </span>
            );
          }

          // Obliteration / Execution / Black Hole
          if (
            upper === 'OBLITERAÇÃO' ||
            upper === 'OBLITERAR' ||
            upper === 'OBLITERA' ||
            upper === 'EXECUTAR' ||
            upper === 'EXECUTA' ||
            upper === 'O ABSOLUTO' ||
            upper === 'BURACO NEGRO'
          ) {
            return (
              <span key={partIdx} className="font-extrabold text-rose-400">
                {part}
              </span>
            );
          }

          // Ice / Freeze / Ethereal
          if (upper === 'CONGELAR' || upper === 'CONGELADO' || upper === 'CONGELA' || upper === 'ETÉREO' || upper === 'ETÉREA' || upper === 'ETEREO' || upper === 'ETEREA') {
            return (
              <span key={partIdx} className="font-extrabold text-cyan-300">
                {part}
              </span>
            );
          }

          // Critical / Damage / Electrified
          if (upper === 'CRÍTICO' || upper === 'CRITICO' || upper === 'BRAVURA' || upper === 'ATAQUE-DUPLO' || upper === 'ATAQUE DUPLO' || upper === 'ENFRENTAR' || upper === 'ELETRIFICADO' || upper === 'ELETRIFICADOS') {
            return (
              <span key={partIdx} className="font-extrabold text-amber-300">
                {part}
              </span>
            );
          }

          // Stealth / Sleep / Torpor / Silence
          if (upper === 'FURTIVIDADE' || upper === 'FURTIVO' || upper === 'SONO' || upper === 'TORPOR' || upper === 'ENTORPECER' || upper === 'SILENCIAR') {
            return (
              <span key={partIdx} className="font-extrabold text-purple-300">
                {part}
              </span>
            );
          }

          // Defense / Heal / Barrier / Immunity / Tenacity
          if (
            upper === 'TENACIDADE' ||
            upper === 'CURA' ||
            upper === 'ROUBO DE VIDA' ||
            upper === 'VIDA MÁXIMA' ||
            upper === 'REVELAR' ||
            upper === 'REVELAÇÃO'
          ) {
            return (
              <span key={partIdx} className="font-extrabold text-emerald-300">
                {part}
              </span>
            );
          }

          if (upper === 'RETORNE' || upper === 'RETORNAR' || upper === 'RETORNO') {
            return (
              <span key={partIdx} className="font-extrabold text-sky-300">
                {part}
              </span>
            );
          }

          if (upper === 'BARREIRA' || upper === 'IMUNIDADE' || upper === 'RESSURREIÇÃO' || upper === 'ALIANÇA ANGIRIS') {
            return (
              <span key={partIdx} className="font-extrabold text-yellow-200">
                {part}
              </span>
            );
          }

          if (upper === 'QUEIMADURA' || upper === 'QUEIMAREM' || upper === 'QUEIMA' || upper === 'ATORDOA') {
            return (
              <span key={partIdx} className="font-extrabold text-orange-300">
                {part}
              </span>
            );
          }

          return <React.Fragment key={partIdx}>{part}</React.Fragment>;
        })}
      </React.Fragment>
    );
  });
}

export const FormattedCardDescription: React.FC<FormattedCardDescriptionProps> = ({
  text,
  variant = 'modal',
  size = 'md',
  hideLevelRequirement = false,
  className = '',
}) => {
  const segments = React.useMemo(
    () =>
      parseCardDescriptionSegments(text, {
        hideLevelRequirement,
        stripTierHeader: variant === 'card-slab' || variant === 'compact',
      }),
    [text, hideLevelRequirement, variant]
  );

  // 1. CARD SLAB VARIANT (Inside CardView.tsx bottom frame)
  if (variant === 'card-slab') {
    const textSizeClass =
      size === 'lg'
        ? 'text-[11px] leading-snug space-y-1'
        : size === 'sm'
        ? 'text-[7.5px] leading-tight space-y-0.5'
        : 'text-[9px] leading-tight space-y-0.5';

    return (
      <div
        className={`text-[#f1f5f9] font-sans font-medium break-words text-pretty overflow-y-auto max-h-full pr-0.5 ${textSizeClass} ${className}`}
      >
        {segments.map((seg, idx) => {
          if (seg.type === 'requirement') {
            return (
              <div key={idx} className="text-amber-300/95 font-semibold">
                <span className="font-extrabold uppercase">Nv.2: </span>
                {seg.content}
              </div>
            );
          }
          if (seg.type === 'level2_extra') {
            return (
              <div key={idx} className="text-purple-200 font-semibold">
                <span className="font-extrabold uppercase text-amber-300">Extra Nv.2: </span>
                {seg.content}
              </div>
            );
          }
          if (seg.type === 'passive') {
            return (
              <div key={idx} className="text-amber-200 font-semibold">
                <span className="font-extrabold">{seg.label}: </span>
                {seg.content}
              </div>
            );
          }
          if (seg.type === 'summon_cond') {
            return (
              <div key={idx} className="text-indigo-200 font-semibold">
                <span className="font-extrabold">{seg.label}: </span>
                {seg.content}
              </div>
            );
          }
          return (
            <div key={idx} className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
              {renderHighlightedText(seg.content)}
            </div>
          );
        })}
      </div>
    );
  }

  // 2. COMPACT VARIANT (Modals like RevealSelectionModal, ActionModals, TestingArenaDrawer, Pack Preview)
  if (variant === 'compact') {
    return (
      <div className={`space-y-1 text-left break-words text-pretty ${className}`}>
        {segments.map((seg, idx) => {
          if (seg.type === 'requirement') {
            return (
              <div
                key={idx}
                className="px-2 py-1 rounded-md bg-amber-950/40 border border-amber-500/30 text-[10px] text-amber-200 leading-snug"
              >
                <strong className="text-amber-400 uppercase font-mono">👑 {seg.label}: </strong>
                <span>{renderHighlightedText(seg.content)}</span>
              </div>
            );
          }
          if (seg.type === 'level2_extra') {
            return (
              <div
                key={idx}
                className="px-2 py-1 rounded-md bg-purple-950/40 border border-purple-500/30 text-[10px] text-purple-200 leading-snug"
              >
                <strong className="text-purple-300 uppercase font-mono">✨ {seg.label}: </strong>
                <span>{renderHighlightedText(seg.content)}</span>
              </div>
            );
          }
          if (seg.type === 'passive') {
            return (
              <div
                key={idx}
                className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-[10px] text-amber-200 leading-snug"
              >
                <strong className="text-amber-300">🪽 {seg.label}: </strong>
                <span>{renderHighlightedText(seg.content)}</span>
              </div>
            );
          }
          if (seg.type === 'summon_cond') {
            return (
              <div
                key={idx}
                className="px-2 py-0.5 rounded-md bg-indigo-950/50 border border-indigo-500/30 text-[10px] text-indigo-200 leading-snug"
              >
                <strong className="text-indigo-300">⏳ {seg.label}: </strong>
                <span>{renderHighlightedText(seg.content)}</span>
              </div>
            );
          }
          return (
            <p key={idx} className="text-[11px] text-stone-200 leading-snug flex items-start gap-1.5">
              {segments.filter((s) => s.type === 'effect').length > 1 && (
                <span className="text-amber-400/80 text-[9px] mt-0.5 shrink-0 select-none">◆</span>
              )}
              <span className="flex-1">{renderHighlightedText(seg.content)}</span>
            </p>
          );
        })}
      </div>
    );
  }

  // 3. GALLERY & MODAL VARIANTS (Full structured breakdown in CardGalleryModal & CardModal)
  const effectCount = segments.filter((s) => s.type === 'effect').length;

  return (
    <div className={`space-y-2 text-left break-words text-pretty ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.type === 'tier_header') {
          return (
            <div key={idx} className="inline-block px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider">
              {seg.content}
            </div>
          );
        }

        if (seg.type === 'summon_cond') {
          return (
            <div
              key={idx}
              className="p-2 rounded-xl bg-indigo-950/45 border border-indigo-500/35 text-xs text-indigo-100 leading-relaxed"
            >
              <div className="text-[10px] font-mono font-black uppercase tracking-wider text-indigo-300 mb-0.5">
                ⏳ {seg.label}
              </div>
              <div>{renderHighlightedText(seg.content)}</div>
            </div>
          );
        }

        if (seg.type === 'passive') {
          return (
            <div
              key={idx}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-100 leading-relaxed flex items-start gap-2"
            >
              <span className="text-amber-400 text-xs shrink-0 mt-0.5 select-none">🪽</span>
              <div className="flex-1">
                <strong className="text-amber-300 font-bold">{seg.label}: </strong>
                <span>{renderHighlightedText(seg.content)}</span>
              </div>
            </div>
          );
        }

        if (seg.type === 'requirement') {
          return (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-amber-950/35 border border-amber-500/35 text-xs text-amber-100 leading-relaxed"
            >
              <div className="text-[10px] font-mono font-black uppercase tracking-wider text-amber-400 mb-0.5 flex items-center gap-1">
                <span>👑 {seg.label}</span>
              </div>
              <div className="text-amber-100/95">{renderHighlightedText(seg.content)}</div>
            </div>
          );
        }

        if (seg.type === 'level2_extra') {
          return (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/40 text-xs text-purple-100 leading-relaxed"
            >
              <div className="text-[10px] font-mono font-black uppercase tracking-wider text-purple-300 mb-0.5 flex items-center gap-1">
                <span>✨ {seg.label}</span>
              </div>
              <div className="text-purple-100/95 space-y-1">{renderHighlightedText(seg.content)}</div>
            </div>
          );
        }

        // Standard effect clause
        return (
          <div
            key={idx}
            className="text-xs text-stone-200 leading-relaxed font-sans flex items-start gap-2"
          >
            {effectCount > 1 && (
              <span className="text-amber-400/90 text-[10px] mt-1 shrink-0 select-none">◆</span>
            )}
            <span className="flex-1">{renderHighlightedText(seg.content)}</span>
          </div>
        );
      })}
    </div>
  );
};
