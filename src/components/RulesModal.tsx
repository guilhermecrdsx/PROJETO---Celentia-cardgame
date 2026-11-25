import React, { useEffect, useState } from 'react';
import { X, BookOpen, Flame, Droplets, Mountain, Zap, Sparkles, Shield, Swords, Trophy, Clock, FileText } from 'lucide-react';
import { PatchNotesPanel } from './PatchNotesPanel';
import { DEFAULT_PUBLISHED_FALLBACK, subscribePublishedPatchNotes } from '../services/patchNotesService';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'rules' | 'patch_notes';
}

export const RulesModal: React.FC<RulesModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'rules',
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'patch_notes'>(initialTab);
  const [activeVersion, setActiveVersion] = useState<string>(DEFAULT_PUBLISHED_FALLBACK.version);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribePublishedPatchNotes((releases) => {
      const current = releases.find((r) => r.isCurrent) || releases[0];
      if (current?.version) {
        setActiveVersion(current.version);
      }
    });
    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[94dvh] flex flex-col rounded-2xl border border-amber-600/40 bg-stone-950 p-4 sm:p-6 shadow-2xl text-stone-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 transition-colors cursor-pointer z-10"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-amber-500/20 pb-3 mb-3 shrink-0 pr-8">
          <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-400 shrink-0">
            {activeTab === 'rules' ? <BookOpen size={22} /> : <FileText size={22} />}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-amber-200 font-serif truncate">
              {activeTab === 'rules'
                ? 'Manual de Regras & Combate'
                : 'Versão Atual & Patch Notes'}
            </h2>
            <p className="text-xs text-stone-400 truncate">
              {activeTab === 'rules'
                ? 'Guia oficial das mecânicas dos Reinos de Granty, Musmo e Naneya'
                : 'Novidades publicadas, ajustes de balanceamento e histórico oficial'}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div
          role="tablist"
          aria-label="Seções do Manual"
          className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-stone-900/90 border border-white/10 mb-4 shrink-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'rules'}
            onClick={() => setActiveTab('rules')}
            className={`min-h-[40px] px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'rules'
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 shadow-md'
                : 'text-stone-300 hover:text-amber-200 hover:bg-white/5'
            }`}
          >
            <BookOpen size={14} />
            <span>Manual de Regras</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'patch_notes'}
            onClick={() => setActiveTab('patch_notes')}
            className={`min-h-[40px] px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'patch_notes'
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 shadow-md'
                : 'text-stone-300 hover:text-amber-200 hover:bg-white/5'
            }`}
          >
            <Sparkles size={14} />
            <span>Patch Notes</span>
            <span
              className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-black ${
                activeTab === 'patch_notes'
                  ? 'bg-stone-950/85 text-amber-300'
                  : 'bg-amber-950/80 text-amber-300 border border-amber-500/35'
              }`}
            >
              {activeVersion}
            </span>
          </button>
        </div>

        {/* Scrollable Tab Body */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {activeTab === 'patch_notes' ? (
            <PatchNotesPanel onActiveVersionChange={setActiveVersion} />
          ) : (
        <div className="space-y-6 text-xs text-stone-300 leading-relaxed">
          {/* 1. Sistema Ranqueado e Modos */}
          <section className="bg-gradient-to-r from-amber-950/30 via-stone-900/60 to-stone-900/60 p-4 rounded-xl border border-amber-500/30 space-y-2">
            <h3 className="font-bold text-amber-300 text-sm flex items-center gap-2">
              <Trophy size={16} className="text-amber-400" />
              1. Modos de Jogo & Sistema Ranqueado
            </h3>
            <p>
              • <strong>Modo Ranqueado:</strong> Partidas competitivas valendo Pontos de Rank (RP). Vitórias concedem +25 RP, empates +5 RP e derrotas deduzem -15 RP.
            </p>
            <p>
              • <strong>Partida Normal:</strong> Partida casual para testar baralhos e estratégias sem afetar seu Rank.
            </p>
            <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1 font-mono">
              <div className="p-2 rounded bg-amber-950/50 border border-amber-700/60 text-amber-300">
                <span className="font-bold block">🛡️ BRONZE</span>
                <span className="text-[10px] text-stone-400">0 a 99 RP</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-400/60 text-slate-200">
                <span className="font-bold block">🦅 PRATA</span>
                <span className="text-[10px] text-stone-400">100 a 199 RP</span>
              </div>
              <div className="p-2 rounded bg-yellow-950/60 border border-yellow-400 text-yellow-300">
                <span className="font-bold block">👑 OURO</span>
                <span className="text-[10px] text-stone-400">200+ RP (Topo)</span>
              </div>
            </div>
          </section>

          {/* 2. Liberação de Cartas por Rodada */}
          <section className="bg-stone-900/60 p-4 rounded-xl border border-white/5 space-y-2">
            <h3 className="font-bold text-amber-300 text-sm flex items-center gap-2">
              <Clock size={16} className="text-amber-400" />
              2. Liberação de Cartas por Rodada (Progressão de Tiers)
            </h3>
            <p>
              As cartas são liberadas gradativamente de acordo com a rodada da partida:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-[11px] font-mono text-center pt-1">
              <div className="p-2 rounded bg-stone-950 border border-stone-700 text-stone-300">
                <span className="font-bold block text-stone-200">Rodadas 1 - 2</span>
                <span className="text-[10px] text-stone-400">Tier 1 (Comuns)</span>
              </div>
              <div className="p-2 rounded bg-emerald-950/40 border border-emerald-600/40 text-emerald-300">
                <span className="font-bold block">Rodadas 3 - 4</span>
                <span className="text-[10px] text-emerald-400">Tier 2 (Incomuns)</span>
              </div>
              <div className="p-2 rounded bg-blue-950/40 border border-blue-600/40 text-blue-300">
                <span className="font-bold block">Rodadas 5 - 6</span>
                <span className="text-[10px] text-blue-400">Tier 3 (Raras)</span>
              </div>
              <div className="p-2 rounded bg-purple-950/40 border border-purple-600/40 text-purple-300">
                <span className="font-bold block">Rodadas 7 - 8</span>
                <span className="text-[10px] text-purple-400">Tier 4 (Épicas)</span>
              </div>
              <div className="p-2 rounded bg-amber-950/50 border border-amber-500/50 text-amber-300">
                <span className="font-bold block">Rodada 9+</span>
                <span className="text-[10px] text-amber-400">Tier 5 (Lendárias)</span>
              </div>
              <div className="p-2 rounded bg-pink-950/50 border border-pink-500/50 text-pink-300">
                <span className="font-bold block">Rodada 10+</span>
                <span className="text-[10px] text-pink-400">Tier 6 (Supremo)</span>
              </div>
            </div>
            <p className="text-[11px] text-amber-200/95 bg-amber-950/35 p-2 rounded border border-amber-500/35">
              ⚜️ <strong>Curva Antecipada Divina:</strong> Unidades da classe <strong>Divino</strong> são liberadas mais cedo: <strong>T1</strong> Rodada 1 · <strong>T2</strong> Rodada 2 · <strong>T3</strong> Rodada 4 · <strong>T4</strong> Rodada 5 · <strong>T5/T6</strong> Rodada 7.
            </p>
            <p className="text-[11px] text-stone-400 pt-1">
              • <strong>Limite de Invocação:</strong> Até 2 cartas de unidade por rodada. Mesa suporta até 5 unidades (ou 6 com Gohr).
            </p>
            <p className="text-[11px] text-stone-400">
              • <strong>Mão Inicial & Compra de Cartas:</strong> Na mão inicial, <strong>1 carta de Tier 1 tem 100% de chance</strong> garantida, <strong>1 carta de Tier 1 adicional tem 50% de chance</strong>, e as demais são aleatórias. Em cada rodada, 1 carta é comprada automaticamente e outra pode ser comprada manualmente.
            </p>
            <p className="text-[11px] text-stone-400">
              • <strong>Estrutura de Turnos & Ações:</strong> Toda rodada inicia obrigatoriamente no <strong>Turno 1 do Jogador Atacante</strong>. <strong>Invocar Unidade</strong>, lançar <strong>Habilidade Lenta</strong>, <strong>Atacar</strong> ou <strong>Passar a Vez</strong> consomem o turno. Já habilidades <strong>Rápidas</strong> e <strong>Fugazes</strong> <strong>não consomem o turno</strong> (mesmo se o oponente reagir na Contra-Resposta, o turno continua com o conjurador).
            </p>
            <p className="text-[11px] text-stone-400">
              • <strong>Encerramento de Rodada & Turno Extra Pós-Ataque:</strong> Se o <strong>Atacante</strong> passar a vez sem ação obrigatória, o turno vai ao <strong>Defensor</strong> (que pode agir ou passar); ao retornar ao Atacante, se ele passar a vez novamente sem ação obrigatória nem ataque (2 passes seguidos do Atacante), a rodada é encerrada. Após um <strong>Ataque</strong>, o Defensor recebe um <strong>Turno Extra Pós-Ataque</strong> garantido (Rápidas e Fugazes continuam livres; o turno só termina ao invocar unidade, usar habilidade lenta ou passar a vez).
            </p>
          </section>

          {/* 3. Classes e Mecânicas Exclusivas (Patch 1.3) */}
          <section className="bg-stone-900/60 p-4 rounded-xl border border-white/5 space-y-3">
            <h3 className="font-bold text-amber-300 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              3. Classes & Identidades Próprias (Sem Vantagem Cruzada)
            </h3>
            <p className="text-[11px] text-amber-200/90 bg-amber-950/30 p-2 rounded border border-amber-600/30">
              ⚡ <strong>Regra Oficial Patch 1.3:</strong> O antigo sistema de vantagem de classe sobre outra foi <strong>totalmente removido</strong>. Cada classe agora possui suas próprias vantagens intrínsecas e fórmulas exclusivas de combate!
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px] py-1 font-mono">
              <div className="p-2 rounded bg-orange-950/40 border border-orange-500/30 text-orange-300">
                <span className="font-bold flex items-center gap-1 text-orange-200">
                  <Flame size={12} /> 🔥 Fogo
                </span>
                <span className="text-[10px] text-stone-300 block">Dano = Ataque + Poder</span>
                <span className="text-[10px] text-orange-400">Poder de fogo devastador</span>
              </div>
              <div className="p-2 rounded bg-sky-950/40 border border-sky-500/30 text-sky-300">
                <span className="font-bold flex items-center gap-1 text-sky-200">
                  <Droplets size={12} /> 💧 Água
                </span>
                <span className="text-[10px] text-stone-300 block">Dano = Atk + 50% Poder</span>
                <span className="text-[10px] text-sky-400">Resistência = Vida + Def + 50% Poder</span>
              </div>
              <div className="p-2 rounded bg-cyan-950/40 border border-cyan-500/30 text-cyan-300">
                <span className="font-bold flex items-center gap-1 text-cyan-200">
                  ❄️ Gelo
                </span>
                <span className="text-[10px] text-stone-300 block">Defesa Extra = +50% Poder</span>
                <span className="text-[10px] text-cyan-400">Dano Adicional = +25% Defesa</span>
              </div>
              <div className="p-2 rounded bg-yellow-950/40 border border-yellow-500/30 text-yellow-300">
                <span className="font-bold flex items-center gap-1 text-yellow-200">
                  <Zap size={12} /> ⚡ Elétrico
                </span>
                <span className="text-[10px] text-stone-300 block">Dano = Atk + 50% Poder</span>
                <span className="text-[10px] text-yellow-400">1º Ataque atordoa na rodada seguinte</span>
              </div>
              <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                <span className="font-bold flex items-center gap-1 text-emerald-200">
                  <Mountain size={12} /> 🌿 Telúrico
                </span>
                <span className="text-[10px] text-stone-300 block">Dano = Ataque</span>
                <span className="text-[10px] text-emerald-400">Vida +50% Poder · Defesa +50% Poder</span>
              </div>
              <div className="p-2 rounded bg-amber-950/45 border border-yellow-400/50 text-amber-200">
                <span className="font-bold flex items-center gap-1 text-yellow-200">
                  ⚜️ Divino
                </span>
                <span className="text-[10px] text-stone-200 block">Dano = Atk + 80% Poder</span>
                <span className="text-[10px] text-amber-300">Invocação Antecipada (T1 R1 .. T5 R7)</span>
              </div>
              <div className="p-2 rounded bg-purple-950/40 border border-purple-500/30 text-purple-300">
                <span className="font-bold flex items-center gap-1 text-purple-200">
                  🔮 Mágico
                </span>
                <span className="text-[10px] text-stone-300 block">Dano = Poder + Ataque recebido</span>
                <span className="text-[10px] text-purple-400">Inicia com 0 Atk · Bônus de Ataque somam ao Dano</span>
              </div>
              <div className="p-2 rounded bg-indigo-950/40 border border-indigo-500/30 text-indigo-300">
                <span className="font-bold flex items-center gap-1 text-indigo-200">
                  🧬 Cósmico
                </span>
                <span className="text-[10px] text-stone-300 block">Dano = Poder | Resist. = Sapiência</span>
                <span className="text-[10px] text-indigo-400">Imune a Queimadura</span>
              </div>
              <div className="p-2 rounded bg-purple-950/55 border border-fuchsia-500/45 text-fuchsia-300">
                <span className="font-bold flex items-center gap-1 text-fuchsia-200">
                  🌑 Sombrio
                </span>
                <span className="text-[10px] text-stone-200 block">Dano = Atk + 50% Poder Crítico</span>
                <span className="text-[10px] text-fuchsia-300">50% do Poder atinge direto a Vida</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-600/40 text-slate-300">
                <span className="font-bold flex items-center gap-1 text-slate-200">
                  ⚔️ Neutro
                </span>
                <span className="text-[10px] text-stone-300 block">Dano = Ataque</span>
                <span className="text-[10px] text-slate-300">+100% Poder em Vida, Ataque e Defesa</span>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-950/25 border border-amber-500/30 text-[11px] text-amber-100/90">
              🧬 <strong>Sistema Multiclasse (Patch 1.4):</strong> Cartas de habilidade que concedem classes (como <em>Apoteose</em>, <em>Toque Ígneo</em>, <em>Força da Natureza</em>, <em>Estático</em> e <em>Nevasca</em>) permitem acumular classes extras no mesmo combatente (incluindo unidades da classe <strong>Mágico</strong>)! Todos os bônus multiplicadores de dano e atributos das classes são somados de forma aditiva. <strong>Restrições:</strong> Unidades nativas <strong>Cósmico</strong> não podem receber multiclasses, e classes repetidas não concedem melhoria adicional.
            </div>
          </section>

          {/* 4. Cálculo do Dano & Tenacidade */}
          <section className="bg-stone-900/60 p-4 rounded-xl border border-amber-500/30 space-y-2">
            <h3 className="font-bold text-amber-300 text-sm flex items-center gap-2">
              <Swords size={16} className="text-amber-400" />
              4. Fórmulas de Combate, Escudos e Mitigação
            </h3>
            <div className="p-3 rounded-lg bg-black/60 border border-white/10 font-mono text-[11px] text-amber-200/90 space-y-2">
              <div className="text-amber-400 font-bold">Fórmulas de Dano Real:</div>
              <div className="pl-3 text-stone-300 space-y-1">
                <div>• <strong>Fogo:</strong> Ataque + Poder</div>
                <div>• <strong>Divino:</strong> Ataque + Math.floor(Poder * 0.8)</div>
                <div>• <strong>Sombrio:</strong> Ataque normal + Math.floor(Poder * 0.5) como <strong>Dano Crítico</strong> (direto na Vida, ou Ataque direto na Vida + 50% do Poder atual quando com Crítico ativo)</div>
                <div>• <strong>Água & Elétrico:</strong> Ataque + Math.floor(Poder / 2)</div>
                <div>• <strong>Gelo:</strong> Ataque + Math.floor(Defesa * 0.25)</div>
                <div>• <strong>Mágico:</strong> Poder + Ataque recebido (inicia com 0 de Ataque)</div>
                <div>• <strong>Cósmico:</strong> Poder</div>
                <div>• <strong>Telúrico & Neutro:</strong> Ataque</div>
              </div>
              <div className="text-cyan-300 font-bold pt-1">❄️ Passiva Gelo, 🌿 Telúrico & ⚔️ Neutro:</div>
              <div className="pl-3 text-stone-300 space-y-1">
                <div>• <strong>Gelo:</strong> Recebe <strong>+50% do Poder como Defesa extra</strong> e causa <strong>+25% do maior pico de Defesa acumulado</strong> como dano adicional!</div>
                <div>• <strong>Telúrico:</strong> Recebe <strong>+50% do Poder como Vida extra</strong> e <strong>+50% do Poder como Defesa extra</strong> de forma viva conforme seu Poder atual!</div>
                <div>• <strong>Neutro:</strong> Recebe <strong>+100% do Poder atual em cada atributo</strong> (Vida, Ataque e Defesa)!</div>
              </div>
              <div className="text-emerald-400 font-bold pt-1">Cálculo de Mitigação (Tenacidade & Aliança Angiris):</div>
              <div className="pl-3 text-stone-300">
                • Com Aliança Angiris + Tenacidade: <strong>Mitiga 67,5% do dano recebido</strong> (50% + 35% do restante)<br />
                • Com Aliança Angiris isolada: <strong>Mitiga 50% do dano recebido</strong><br />
                • Com Tenacidade isolada: <strong>Mitiga 35% do dano recebido</strong>
              </div>
              <div className="text-sky-300 pt-1 font-bold">Resistência Total & Escudo de Defesa:</div>
              <div className="pl-3 text-stone-300">
                <strong>Resistência = Vida + Defesa</strong> (ou Sapiência para Cósmicos)<br />
                <span className="text-amber-300/90 italic">* O dano sempre consome primeiro o valor de DEFESA como escudo antes de subtrair a VIDA da unidade (exceto com CRÍTICO)!</span>
              </div>
            </div>
          </section>

          {/* 5. Lista Oficial de Efeitos de Condição */}
          <section className="bg-stone-900/60 p-4 rounded-xl border border-white/5 space-y-3">
            <h3 className="font-bold text-amber-300 text-sm flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              5. Lista Oficial de Efeitos de Condição (4 Categorias & Bordas)
            </h3>

            {/* Sistema de Bordas Quadradas */}
            <div className="p-2.5 rounded-lg bg-black/50 border border-white/10 text-[11px] space-y-1">
              <div className="font-bold text-stone-200 uppercase tracking-wider text-[10px]">
                Significado das Bordas Quadradas nas Cartas:
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="px-2 py-0.5 rounded-[2px] border-2 border-blue-900 bg-blue-950/70 text-blue-200 font-semibold">
                  Azul Escuro: Idica Efeitos únicos da própria unidade
                </span>
                <span className="px-2 py-0.5 rounded-[2px] border-2 border-amber-400 bg-amber-950/70 text-amber-200 font-semibold shadow-[0_0_8px_rgba(251,191,36,0.45)]">
                  Dourada: Indica Passivas únicas da própria unidade
                </span>
                <span className="px-2 py-0.5 rounded-[2px] border-2 border-emerald-700 bg-emerald-950/70 text-emerald-200 font-semibold">
                  Verde Escuro: Melhoria recebida por outra unidade ou habilidade
                </span>
                <span className="px-2 py-0.5 rounded-[2px] border-2 border-orange-500 bg-orange-950/70 text-orange-200 font-semibold">
                  Laranja: Idica efeitos condições relacionadas ao combate
                </span>
                <span className="px-2 py-0.5 rounded-[2px] border-2 border-red-600 bg-red-950/70 text-red-200 font-semibold">
                  Vermelho: Indica efeitos negativos
                </span>
              </div>
            </div>

            {/* Proteção (Verde Lima) */}
            <div className="space-y-1.5">
              <div className="text-xs font-black uppercase tracking-wider text-lime-400">
                🛡️ Proteção
              </div>
              <div className="p-2 rounded bg-black/40 border border-lime-500/40">
                <strong className="text-lime-400">💚 CURA:</strong> Regenera <strong>9 de Vida</strong> a cada rodada em que o efeito estiver ativo.
              </div>
              <div className="p-2 rounded bg-black/40 border border-lime-500/40">
                <strong className="text-lime-400">🛡️ TENACIDADE:</strong> Reduz todo o dano sofrido em <strong>35%</strong>.
              </div>
              <div className="p-2 rounded bg-black/40 border border-lime-500/40">
                <strong className="text-lime-400">🌐 BARREIRA:</strong> Bloqueia completamente qualquer forma de dano uma única vez (inclusive habilidades).
              </div>
              <div className="p-2 rounded bg-black/40 border border-lime-500/40">
                <strong className="text-lime-400">🌟 IMUNIDADE:</strong> Torna a unidade <strong>IMUNE</strong> a todos os efeitos Negativos.
              </div>
              <div className="p-2 rounded bg-black/40 border border-lime-500/40">
                <strong className="text-lime-400">✨ RESSURREIÇÃO:</strong> A unidade retorna totalmente restaurada da morte uma única vez.
              </div>
            </div>

            {/* Negativos (Vermelho) */}
            <div className="space-y-1.5">
              <div className="text-xs font-black uppercase tracking-wider text-red-400">
                ☠️ Negativos
              </div>
              <div className="p-2 rounded bg-black/40 border border-red-500/40">
                <strong className="text-red-400">🔥 QUEIMADURA:</strong> Causa <strong>4 de dano</strong> diretamente na Vida da unidade por rodada ativa.
              </div>
              <div className="p-2 rounded bg-black/40 border border-red-500/40">
                <strong className="text-red-400">😴 SONO:</strong> A unidade fica <strong>IMÓVEL</strong> (não pode atacar nem defender). Ao despertar, se tiver <strong>11 ou menos de Vida</strong> é eliminada! Dura conforme quem aplicou o efeito.
              </div>
              <div className="p-2 rounded bg-black/40 border border-red-500/40">
                <strong className="text-red-400">❄️ CONGELAR:</strong> Aumenta todo o dano recebido pela unidade em <strong>+50%</strong>.
              </div>
              <div className="p-2 rounded bg-black/40 border border-red-500/40">
                <strong className="text-red-400">⚡ ELETRIFICADO:</strong> Aumenta o dano <strong>ELÉTRICO</strong> recebido pela unidade em <strong>+20%</strong>.
              </div>
              <div className="p-2 rounded bg-black/40 border border-red-500/40">
                <strong className="text-red-400">🌀 TORPOR:</strong> A unidade tem <strong>35% de chance</strong> de atacar uma unidade aliada aleatória em campo por engano.
              </div>
              <div className="p-2 rounded bg-black/40 border border-red-500/40">
                <strong className="text-red-400">⚡ ATORDOAMENTO:</strong> A unidade fica <strong>IMÓVEL</strong> (não pode atacar nem defender) enquanto o efeito estiver ativo.
              </div>
              <div className="p-2 rounded bg-black/40 border border-red-500/40">
                <strong className="text-red-400">🔇 SILÊNCIO:</strong> Bloqueia todos os Efeitos Únicos, Passivas e Requisitos de Subir de Nível. Unidades silenciadas <strong>não podem subir de nível</strong>, mesmo com Escolhido das Estrelas, até o silêncio encerrar.
              </div>
              <div className="p-2 rounded bg-black/40 border border-orange-500/40">
                <strong className="text-red-400">🕳️ OBLITERAR:</strong> Elimina uma unidade instantaneamente. Bloqueia/Silencia efeitos de condição e passivas.
              </div>
              <div className="p-2 rounded bg-black/40 border border-red-500/40">
                <strong className="text-red-400">💀 EXECUTAR:</strong> Elimina a unidade ignorando Vida e Defesa (respeitando <strong>Imunidade</strong>). Diferente de <strong>OBLITERAR</strong>, efeitos de <strong>Ressurreição</strong> ou gatilhos de morte ocorrem normalmente.
              </div>
              <div className="p-2 rounded bg-black/40 border border-red-500/40">
                <strong className="text-red-400">☠️ PRAGA:</strong> Unidades afetadas por Praga ficam com todos os seus atributos (Vida, Ataque, Defesa e Poder) reduzidos em <strong>25%</strong> enquanto o efeito durar.
              </div>
              <div className="p-2 rounded bg-black/40 border border-red-500/40">
                <strong className="text-red-400">🧪 CORROSÃO:</strong> Unidades afetadas por Corrosão recebem <strong>1 de dano diretamente na sua Vida a cada TURNO</strong> das rodadas em que permanecer ativo. Além disso, <strong>corta toda a cura</strong> recebida pela unidade.
              </div>
              <div className="p-2 rounded bg-black/40 border border-red-500/40">
                <strong className="text-red-400">🩸 SANGRAMENTO & 💔 HEMORRAGIA:</strong> Causa <strong>2 de dano a cada rodada</strong> ativo. Ao causar dano <strong>4 vezes</strong> no mesmo inimigo (em sequência ou intercalando), o Sangramento se transforma em <strong>Hemorragia</strong> e causa <strong>25% da Vida Máxima</strong> da unidade afetada como dano. 
              </div>
            </div>

            {/* Combate (Laranja) */}
            <div className="space-y-1.5">
              <div className="text-xs font-black uppercase tracking-wider text-orange-400">
                ⚔️ Combate
              </div>
              <div className="p-2 rounded bg-black/40 border border-orange-500/40">
                <strong className="text-orange-400">🎺 BRAVURA:</strong> O dano excedente à Resistência da unidade atacada atinge a vida do jogador inimigo, causando <strong>1 de dano</strong> como ataque direto.
              </div>
              <div className="p-2 rounded bg-black/40 border border-orange-500/40">
                <strong className="text-orange-400">🗡️ ENFRENTAR:</strong> Ao declarar ataque, a unidade pode escolher e forçar diretamente qual unidade inimiga irá defender seu ataque.
              </div>
              <div className="p-2 rounded bg-black/40 border border-orange-500/40">
                <strong className="text-orange-400">👤 FURTIVIDADE:</strong> Unidades furtivas só podem ser bloqueadas em um ataque por outras unidades furtivas.
              </div>
              <div className="p-2 rounded bg-black/40 border border-orange-500/40">
                <strong className="text-orange-400">👻 ETÉREO:</strong> Unidades etéreas só podem ser bloqueadas em um ataque por outras unidades etéreas, apenas.
              </div>
              <div className="p-2 rounded bg-black/40 border border-orange-500/40">
                <strong className="text-orange-400">🎯 CRÍTICO:</strong> O dano é causado diretamente na <strong>VIDA</strong> da unidade atacada, ignorando completamente sua defesa.
              </div>
              <div className="p-2 rounded bg-black/40 border border-orange-500/40">
                <strong className="text-orange-400">🩸 ROUBO DE VIDA:</strong> Cura <strong>40% do dano causado</strong> ao atacar diretamente na Vida da unidade atacante, somando antes da aplicação do dano de rebote.
              </div>
              <div className="p-2 rounded bg-black/40 border border-orange-500/40">
                <strong className="text-orange-400">⚔️ ATAQUE-DUPLO:</strong> Executa um segundo ataque na unidade causando <strong>60% do dano original</strong> (rebote defensivo é aplicado apenas uma vez).
              </div>
            </div>

            {/* Situacionais (Azul Claro) */}
            <div className="space-y-1.5">
              <div className="text-xs font-black uppercase tracking-wider text-sky-400">
                🔮 Situacionais
              </div>
              <div className="p-2 rounded bg-black/40 border border-sky-500/40">
                <strong className="text-sky-400">👁️ REVELAR:</strong> Um portal místico em espiral revela as <strong>5 primeiras cartas do topo do baralho</strong>; o jogador escolhe 1 para ir à mão e o turno aguarda a escolha.
              </div>
              <div className="p-2 rounded bg-black/40 border border-sky-500/40">
                <strong className="text-sky-400">⛓️ CAPTURAR:</strong> Transfere uma carta do adversário (baralho ou mesa) para a sua mão respeitando o limite de 8 cartas. Unidades capturadas da mesa têm seus atributos e efeitos restaurados ao estado original.
              </div>
              <div className="p-2 rounded bg-black/40 border border-sky-500/40">
                <strong className="text-sky-400">🕊️ RETORNO / RETORNAR:</strong> Abre uma seleção com até <strong>3 cartas aleatórias do seu cemitério (cripta)</strong>; escolha 1 para retornar imediatamente para sua mão.
              </div>
            </div>
          </section>

          {/* 6. Passivas Exclusivas */}
          <section className="bg-stone-900/60 p-4 rounded-xl border border-white/5 space-y-2">
            <h3 className="font-bold text-amber-300 text-sm flex items-center gap-2">
              <Shield size={16} className="text-amber-400" />
              6. Passivas Exclusivas (Ícones Independentes com Borda Dourada)
            </h3>
            <p>
              • <strong>👼 Aliança Angiris:</strong> Quando dois ou mais arcanjos estiverem na mesa simultaneamente, ambos recebem Aliança Angiris (+50% dano causado e -50% dano recebido; com Tenacidade mitiga 67,5%). <strong className="text-amber-300">Efeito Passivo Adicional — Vitória do Conselho Celestial:</strong> Ao <strong>fim da rodada</strong> em que houver pelo menos <strong>1 Arcanjo de cada Tier (Tiers 1, 2, 3, 4 e 5)</strong> na mesa simultaneamente, o efeito do Conselho é ativado, <strong>curando totalmente a Vida do jogador aliado</strong> e decretando a <strong>"Vitória do Conselho Celestial"</strong>!
            </p>
            <p>
              • <strong>🧚 Corte das Fadas (Todas as Unidades Fada):</strong> Ativa-se quando houver <strong>3 ou mais Fadas invocadas na mesa</strong>. Salva o jogador da morte uma única vez: ao chegar a zero de vida, o jogador recebe <strong>2 pontos extras de vida (na cor rosa)</strong> e todas as unidades Fadas na mesa recebem <strong>+75% de PODER</strong>!
            </p>
            <p>
              • <strong>👥 Irmãos (Inariel & Zael):</strong> Passiva independente de Aliança Angiris. Enquanto Inariel estiver na mesa, Zael não sairá da luta ao término da rodada.
            </p>
            <p>
              • <strong>Nevasca de Bonetrus & A Lâmina do Inverno:</strong> Ao final da rodada em que Bonetrus e A Lâmina do Inverno estiverem na mesa, a espada é consumida e Bonetrus ascende para o Nível 2 (executa inimigos congelados com Vida ≤ 12 e desfere ataques em área ao atacar sozinho).
            </p>
          </section>
        </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs uppercase tracking-wider transition-colors shadow-lg cursor-pointer"
          >
            Entendido, Voltar ao Jogo
          </button>
        </div>
      </div>
    </div>
  );
};

