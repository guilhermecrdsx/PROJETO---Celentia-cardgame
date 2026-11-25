import React from 'react';
import { CardInstance } from '../types/game';
import { CardView } from './CardView';
import { FormattedCardDescription } from './FormattedCardDescription';
import { X, Target, Trash2 } from 'lucide-react';

interface TargetSelectModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  candidates: CardInstance[];
  onSelect: (card: CardInstance) => void;
  onCancel: () => void;
  onInspect?: (card: CardInstance) => void;
  getBadgeLabel?: (card: CardInstance) => string | undefined;
  allyInstanceIds?: Set<string>;
  enemyInstanceIds?: Set<string>;
  allyGroupLabel?: string;
  enemyGroupLabel?: string;
}

export const TargetSelectModal: React.FC<TargetSelectModalProps> = ({
  isOpen,
  title,
  description,
  candidates,
  onSelect,
  onCancel,
  onInspect,
  getBadgeLabel,
  allyInstanceIds,
  enemyInstanceIds,
  allyGroupLabel,
  enemyGroupLabel,
}) => {
  if (!isOpen) return null;

  const enemyCandidates = enemyInstanceIds
    ? candidates.filter((c) => enemyInstanceIds.has(c.instanceId))
    : [];
  const allyCandidates = allyInstanceIds
    ? candidates.filter(
        (c) => allyInstanceIds.has(c.instanceId) && !enemyInstanceIds?.has(c.instanceId)
      )
    : [];
  const categorizedIds = new Set([
    ...enemyCandidates.map((c) => c.instanceId),
    ...allyCandidates.map((c) => c.instanceId),
  ]);
  const uncategorizedCandidates = candidates.filter((c) => !categorizedIds.has(c.instanceId));
  const hasMixedSides = enemyCandidates.length > 0 && allyCandidates.length > 0;

  const singleSideTone: 'enemy' | 'ally' | undefined =
    !hasMixedSides && uncategorizedCandidates.length === 0
      ? enemyCandidates.length > 0
        ? 'enemy'
        : allyCandidates.length > 0
        ? 'ally'
        : undefined
      : undefined;

  const renderCandidateCard = (card: CardInstance, sideTone?: 'enemy' | 'ally') => {
    const badge = getBadgeLabel ? getBadgeLabel(card) : undefined;
    const cardForDisplay = card.isDying ? { ...card, isDying: false } : card;
    const hoverRingClass =
      sideTone === 'enemy'
        ? 'hover:ring-2 hover:ring-rose-400/90 hover:shadow-[0_0_20px_rgba(244,63,94,0.45)]'
        : sideTone === 'ally'
        ? 'hover:ring-2 hover:ring-emerald-400/90 hover:shadow-[0_0_20px_rgba(16,185,129,0.45)]'
        : 'hover:ring-2 hover:ring-amber-400/90 hover:shadow-[0_0_20px_rgba(251,191,36,0.4)]';

    return (
      <div key={card.instanceId} className="relative flex flex-col items-center gap-1.5">
        {badge && (
          <span className="px-2 py-0.5 rounded-full bg-amber-950/90 border border-amber-400/60 text-[10px] font-bold text-amber-200 shadow">
            {badge}
          </span>
        )}
        <div className={`rounded-xl transition-all duration-150 active:scale-95 ${hoverRingClass}`}>
          <CardView
            card={cardForDisplay}
            size="sm"
            isPlayable={true}
            actionLabel="Selecionar"
            onClick={() => onSelect(card)}
            onInspect={onInspect ? () => onInspect(card) : undefined}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div
        className={`relative w-full ${
          hasMixedSides ? 'max-w-3xl' : 'max-w-2xl'
        } max-h-[94dvh] overflow-y-auto rounded-2xl border border-amber-500/40 bg-stone-950 p-4 sm:p-6 shadow-2xl text-stone-200`}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 transition-colors cursor-pointer"
          aria-label="Fechar modal"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 border-b border-white/10 pb-3 mb-4 pr-8">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <Target size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-amber-200">{title}</h3>
            <div className="mt-1">
              <FormattedCardDescription text={description} variant="compact" />
            </div>
          </div>
        </div>

        {candidates.length === 0 ? (
          <div className="text-center py-8 text-stone-400 text-xs">
            Nenhum alvo válido encontrado em campo.
          </div>
        ) : hasMixedSides ? (
          <div className="flex flex-col gap-3 max-h-[64vh] overflow-y-auto py-1 pr-0.5">
            {/* Seção Superior: Unidades Inimigas */}
            <div className="rounded-2xl border border-rose-500/45 bg-gradient-to-b from-rose-950/35 to-stone-950/70 p-3 shadow-inner">
              <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-rose-500/25">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-rose-500/20 border border-rose-400/50 text-rose-300 text-xs">
                    ⚔️
                  </span>
                  <span className="text-xs font-serif font-black uppercase tracking-wider text-rose-300">
                    {enemyGroupLabel || 'Unidades Inimigas'}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-rose-950/80 border border-rose-500/40 text-[10px] font-mono font-bold text-rose-200">
                  {enemyCandidates.length} {enemyCandidates.length === 1 ? 'unidade' : 'unidades'}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 py-1">
                {enemyCandidates.map((card) => renderCandidateCard(card, 'enemy'))}
              </div>
            </div>

            {/* Divisória Central */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-stone-700 to-transparent" />
              <span className="text-[10px] font-serif font-bold uppercase tracking-widest text-stone-500 px-1.5">
                Campo de Batalha
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-stone-700 to-transparent" />
            </div>

            {/* Seção Inferior: Unidades Aliadas */}
            <div className="rounded-2xl border border-emerald-500/45 bg-gradient-to-b from-emerald-950/35 to-stone-950/70 p-3 shadow-inner">
              <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-emerald-500/25">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs">
                    🛡️
                  </span>
                  <span className="text-xs font-serif font-black uppercase tracking-wider text-emerald-300">
                    {allyGroupLabel || 'Unidades Aliadas'}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-200">
                  {allyCandidates.length} {allyCandidates.length === 1 ? 'unidade' : 'unidades'}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 py-1">
                {allyCandidates.map((card) => renderCandidateCard(card, 'ally'))}
              </div>
            </div>

            {uncategorizedCandidates.length > 0 && (
              <div className="rounded-2xl border border-stone-700/60 bg-stone-900/40 p-3">
                <div className="flex flex-wrap items-center justify-center gap-3 py-1">
                  {uncategorizedCandidates.map((card) => renderCandidateCard(card))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-3 max-h-[60vh] overflow-y-auto py-2">
            {candidates.map((card) => renderCandidateCard(card, singleSideTone))}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-stone-400">
            Clique diretamente na carta desejada para confirmar o alvo
            {onInspect ? ' · Use 👁️ para inspecionar' : ''}
          </span>
          <button
            onClick={onCancel}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs transition-colors cursor-pointer"
          >
            Cancelar Ação
          </button>
        </div>
      </div>
    </div>
  );
};

interface DiscardSelectModalProps {
  isOpen: boolean;
  boardCards: CardInstance[];
  incomingCardName: string;
  onSelectDiscard: (card: CardInstance) => void;
  onCancel: () => void;
  onInspect?: (card: CardInstance) => void;
}

export const DiscardSelectModal: React.FC<DiscardSelectModalProps> = ({
  isOpen,
  boardCards,
  incomingCardName,
  onSelectDiscard,
  onCancel,
  onInspect,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl max-h-[94dvh] overflow-y-auto rounded-2xl border border-rose-500/40 bg-stone-950 p-4 sm:p-6 shadow-2xl text-stone-200">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 transition-colors cursor-pointer"
          aria-label="Fechar modal"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 border-b border-rose-500/20 pb-3 mb-4 pr-8">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <Trash2 size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-rose-300">
              Mesa Cheia (5/5) - Descarte uma Carta
            </h3>
            <p className="text-xs text-stone-400">
              Para invocar <strong>{incomingCardName}</strong>, clique na carta da sua mesa que deseja enviar ao descarte/lixo.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 max-h-[60vh] overflow-y-auto py-2">
          {boardCards.map((card) => (
            <div
              key={card.instanceId}
              className="rounded-xl transition-all duration-150 active:scale-95 hover:ring-2 hover:ring-rose-400/90 hover:shadow-[0_0_20px_rgba(244,63,94,0.45)]"
            >
              <CardView
                card={card}
                size="sm"
                isPlayable={true}
                actionLabel="Descartar"
                onClick={() => onSelectDiscard(card)}
                onInspect={onInspect ? () => onInspect(card) : undefined}
              />
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-stone-400">
            Clique diretamente na carta para descartar
            {onInspect ? ' · Use 👁️ para inspecionar' : ''}
          </span>
          <button
            onClick={onCancel}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs transition-colors cursor-pointer"
          >
            Cancelar Invocação
          </button>
        </div>
      </div>
    </div>
  );
};

interface ConfirmActionModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmar Invocação',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md max-h-[94dvh] overflow-y-auto rounded-2xl border-2 border-amber-500/60 bg-stone-950 p-5 sm:p-6 shadow-2xl text-stone-200">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 border-b border-amber-500/20 pb-3 mb-4">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-2xl">
            📜
          </div>
          <div>
            <h3 className="text-base font-serif font-black text-amber-300">{title}</h3>
            <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Confirmação de Ação</span>
          </div>
        </div>

        <div className="bg-stone-900/80 p-3.5 rounded-xl border border-white/5 mb-5">
          <FormattedCardDescription text={description} variant="modal" />
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
          >
            {confirmLabel} ⚔️
          </button>
        </div>
      </div>
    </div>
  );
};

interface ZykDiscardModalProps {
  isOpen: boolean;
  handCards: CardInstance[];
  boardCards: CardInstance[];
  selectedCardIds: string[];
  isBoardFull?: boolean;
  onToggleSelect: (cardId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ZykDiscardModal: React.FC<ZykDiscardModalProps> = ({
  isOpen,
  handCards,
  boardCards,
  selectedCardIds,
  isBoardFull = false,
  onToggleSelect,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const hasBoardCardSelected = selectedCardIds.some((id) =>
    boardCards.some((c) => c.instanceId === id)
  );
  const canConfirm =
    selectedCardIds.length === 2 && (!isBoardFull || hasBoardCardSelected);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[94dvh] overflow-y-auto rounded-3xl border-2 border-indigo-500/60 bg-gradient-to-b from-stone-950 via-stone-900 to-indigo-950/60 p-4 sm:p-6 shadow-2xl text-stone-200">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 border-b border-indigo-500/30 pb-3 mb-4">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-2xl">
            🧬⏳
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-indigo-400">
              Preço Temporal · Invocação de Zyk, o Eminente
            </div>
            <h3 className="text-lg font-serif font-black text-indigo-200">
              Descarte 2 Cartas (da Mesa ou da Mão)
            </h3>
            <p className="text-xs text-stone-400">
              Selecione exatamente <strong>2 cartas</strong> da sua mão ou da sua mesa para pagar o tributo de invocação de Zyk ({selectedCardIds.length}/2 selecionadas):
            </p>
          </div>
        </div>

        {isBoardFull && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-950/60 border border-amber-500/50 text-amber-200 text-xs flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>
              <strong>Mesa Cheia:</strong> Pelo menos <strong>1 das 2 cartas sacrificadas</strong> deve vir da sua <strong>Mesa</strong> para liberar o espaço ocupado por Zyk!
            </span>
          </div>
        )}

        {/* Board Cards Section */}
        <div className="mb-4">
          <div className="text-xs font-bold text-amber-300 mb-2 flex items-center gap-1.5">
            <span>🛡️ Cartas na Mesa:</span>
            <span className="text-stone-400 font-normal">({boardCards.length} disponíveis)</span>
          </div>
          {boardCards.length === 0 ? (
            <div className="text-stone-500 text-xs italic py-2">Nenhuma carta na mesa no momento.</div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 max-h-[25vh] overflow-y-auto py-1">
              {boardCards.map((card) => {
                const isSelected = selectedCardIds.includes(card.instanceId);
                return (
                  <div
                    key={card.instanceId}
                    onClick={() => onToggleSelect(card.instanceId)}
                    className={`relative cursor-pointer rounded-2xl transition-all p-1 ${
                      isSelected
                        ? 'ring-4 ring-rose-500 bg-rose-950/40 scale-105 shadow-[0_0_20px_rgba(244,63,94,0.6)]'
                        : 'hover:scale-102 hover:border-white/40'
                    }`}
                  >
                    <CardView card={card} size="sm" isPlayable={false} />
                    <div
                      className={`mt-1 py-0.5 px-2 rounded text-[10px] font-bold text-center uppercase tracking-wider transition-colors ${
                        isSelected ? 'bg-rose-600 text-white' : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      {isSelected ? '✓ Selecionada' : 'Selecionar'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Hand Cards Section */}
        <div className="mb-4 pt-3 border-t border-white/10">
          <div className="text-xs font-bold text-sky-300 mb-2 flex items-center gap-1.5">
            <span>🃏 Cartas na Mão:</span>
            <span className="text-stone-400 font-normal">({handCards.length} disponíveis)</span>
          </div>
          {handCards.length === 0 ? (
            <div className="text-stone-500 text-xs italic py-2">Nenhuma outra carta na mão.</div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 max-h-[25vh] overflow-y-auto py-1">
              {handCards.map((card) => {
                const isSelected = selectedCardIds.includes(card.instanceId);
                return (
                  <div
                    key={card.instanceId}
                    onClick={() => onToggleSelect(card.instanceId)}
                    className={`relative cursor-pointer rounded-2xl transition-all p-1 ${
                      isSelected
                        ? 'ring-4 ring-rose-500 bg-rose-950/40 scale-105 shadow-[0_0_20px_rgba(244,63,94,0.6)]'
                        : 'hover:scale-102 hover:border-white/40'
                    }`}
                  >
                    <CardView card={card} size="sm" isPlayable={false} />
                    <div
                      className={`mt-1 py-0.5 px-2 rounded text-[10px] font-bold text-center uppercase tracking-wider transition-colors ${
                        isSelected ? 'bg-rose-600 text-white' : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      {isSelected ? '✓ Selecionada' : 'Selecionar'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-stone-400">
            {selectedCardIds.length === 2
              ? isBoardFull && !hasBoardCardSelected
                ? 'Selecione pelo menos 1 carta da mesa para abrir vaga para Zyk.'
                : 'Tributo pronto! Clique em Confirmar para invocar Zyk.'
              : `Selecione mais ${2 - selectedCardIds.length} carta(s).`}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={!canConfirm}
              className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${
                canConfirm
                  ? 'bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 cursor-pointer'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed'
              }`}
            >
              Confirmar Descarte e Invocar Zyk 🧬
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
