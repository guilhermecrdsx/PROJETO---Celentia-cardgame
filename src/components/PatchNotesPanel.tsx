import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  FileText,
  Globe,
  History,
  Loader2,
  Lock,
  Plus,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { ADMIN_EMAIL, auth } from '../lib/firebase';
import {
  createNewPatchEntry,
  DEFAULT_INITIAL_PATCH_DRAFT,
  DEFAULT_PUBLISHED_FALLBACK,
  deletePublishedRelease,
  getTodayBrDate,
  isAdminUser,
  PATCH_CATEGORY_META,
  publishDraftAsNewRelease,
  saveAdminDraft,
  signInAdminWithGoogle,
  subscribeAdminDraft,
  subscribePublishedPatchNotes,
  updatePublishedRelease,
  validatePatchDraft,
  type PatchCategory,
  type PatchNoteDraft,
  type PatchNoteEntry,
  type PatchNoteRelease,
} from '../services/patchNotesService';

interface PatchNotesPanelProps {
  onActiveVersionChange?: (version: string) => void;
}

function cloneDraft(draft: PatchNoteDraft): PatchNoteDraft {
  return {
    version: draft.version,
    title: draft.title,
    summary: draft.summary,
    releaseDate: draft.releaseDate,
    entries: draft.entries.map((e) => ({ ...e })),
    updatedAtMs: draft.updatedAtMs,
    updatedBy: draft.updatedBy,
  };
}

function formatSavedTime(ms?: number): string {
  if (!ms) return '';
  try {
    return new Date(ms).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export const PatchNotesPanel: React.FC<PatchNotesPanelProps> = ({
  onActiveVersionChange,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(() => auth.currentUser);
  const adminAuthorized = isAdminUser(firebaseUser);

  const [publishedReleases, setPublishedReleases] = useState<PatchNoteRelease[]>([]);
  const [loadingPublic, setLoadingPublic] = useState<boolean>(true);
  const [publicError, setPublicError] = useState<string | null>(null);

  const [adminView, setAdminView] = useState<'public' | 'draft'>('public');
  const [editingReleaseId, setEditingReleaseId] = useState<string | null>(null);
  const [editingReleaseIsCurrent, setEditingReleaseIsCurrent] = useState<boolean>(false);

  const [draft, setDraft] = useState<PatchNoteDraft>(() =>
    cloneDraft(DEFAULT_INITIAL_PATCH_DRAFT)
  );
  const [hasRemoteDraft, setHasRemoteDraft] = useState<boolean>(false);
  const [draftDirty, setDraftDirty] = useState<boolean>(false);
  const [draftLoadedOnce, setDraftLoadedOnce] = useState<boolean>(false);

  const [busyAction, setBusyAction] = useState<'save' | 'publish' | 'auth' | 'delete' | null>(null);
  const [confirmPublish, setConfirmPublish] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Record<string, boolean>>({});

  // Track Firebase Auth user state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!isAdminUser(user)) {
        setAdminView('public');
        setEditingReleaseId(null);
      }
    });
    return unsub;
  }, []);

  // Live subscription to public published patch notes
  useEffect(() => {
    setLoadingPublic(true);
    setPublicError(null);
    const unsub = subscribePublishedPatchNotes(
      (releases) => {
        setPublishedReleases(releases);
        setLoadingPublic(false);
        setPublicError(null);
      },
      () => {
        setLoadingPublic(false);
        setPublicError('Não foi possível sincronizar as notas online agora. Exibindo versão local.');
      }
    );
    return unsub;
  }, []);

  // Live subscription to private admin draft (ONLY when verified admin is logged in)
  useEffect(() => {
    if (!adminAuthorized) {
      setHasRemoteDraft(false);
      setDraftLoadedOnce(false);
      return;
    }

    const unsub = subscribeAdminDraft(
      true,
      (remoteDraft) => {
        setHasRemoteDraft(Boolean(remoteDraft));
        if (remoteDraft && !draftDirty && !editingReleaseId) {
          setDraft(cloneDraft(remoteDraft));
        } else if (!remoteDraft && !draftLoadedOnce && !draftDirty && !editingReleaseId) {
          setDraft(cloneDraft(DEFAULT_INITIAL_PATCH_DRAFT));
        }
        setDraftLoadedOnce(true);
      },
      (errMsg) => {
        setStatusBanner({
          type: 'error',
          message: `Erro ao sincronizar rascunho privado: ${errMsg}`,
        });
      }
    );

    return unsub;
  }, [adminAuthorized, draftDirty, draftLoadedOnce, editingReleaseId]);

  const effectiveReleases = useMemo<PatchNoteRelease[]>(() => {
    if (publishedReleases.length > 0) return publishedReleases;
    return [DEFAULT_PUBLISHED_FALLBACK];
  }, [publishedReleases]);

  const currentRelease = useMemo<PatchNoteRelease>(() => {
    return effectiveReleases.find((r) => r.isCurrent) || effectiveReleases[0];
  }, [effectiveReleases]);

  const historyReleases = useMemo<PatchNoteRelease[]>(() => {
    return effectiveReleases.filter((r) => r.id !== currentRelease.id);
  }, [effectiveReleases, currentRelease.id]);

  const suggestedVersion = DEFAULT_INITIAL_PATCH_DRAFT.version.trim();
  const hasUnpublishedSuggestedRelease = useMemo<boolean>(() => {
    if (!adminAuthorized) return false;
    const targetLower = suggestedVersion.toLowerCase();
    return !publishedReleases.some((r) => r.version.trim().toLowerCase() === targetLower);
  }, [adminAuthorized, publishedReleases, suggestedVersion]);

  const isDraftMatchingSuggested =
    draft.version.trim().toLowerCase() === suggestedVersion.toLowerCase();

  useEffect(() => {
    if (currentRelease?.version) {
      onActiveVersionChange?.(currentRelease.version);
    }
  }, [currentRelease?.version, onActiveVersionChange]);

  const updateDraftField = <K extends keyof PatchNoteDraft>(
    key: K,
    value: PatchNoteDraft[K]
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setDraftDirty(true);
    setConfirmPublish(false);
  };

  const updateEntry = (index: number, patch: Partial<PatchNoteEntry>) => {
    setDraft((prev) => {
      const next = prev.entries.map((entry, idx) =>
        idx === index ? { ...entry, ...patch } : entry
      );
      return { ...prev, entries: next };
    });
    setDraftDirty(true);
    setConfirmPublish(false);
  };

  const addEntry = (category: PatchCategory = 'feature') => {
    if (draft.entries.length >= 40) {
      setStatusBanner({ type: 'error', message: 'Limite máximo de 40 itens atingido.' });
      return;
    }
    setDraft((prev) => ({
      ...prev,
      entries: [...prev.entries, createNewPatchEntry(category)],
    }));
    setDraftDirty(true);
  };

  const removeEntry = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      entries: prev.entries.filter((_, idx) => idx !== index),
    }));
    setDraftDirty(true);
  };

  const moveEntry = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draft.entries.length) return;
    setDraft((prev) => {
      const next = [...prev.entries];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return { ...prev, entries: next };
    });
    setDraftDirty(true);
  };

  const handleLoadSuggestedDraft = () => {
    setEditingReleaseId(null);
    setDraft(
      cloneDraft({
        ...DEFAULT_INITIAL_PATCH_DRAFT,
        releaseDate: getTodayBrDate(),
      })
    );
    setDraftDirty(true);
    setConfirmPublish(false);
    setAdminView('draft');
    setStatusBanner({
      type: 'info',
      message: `Rascunho da ${suggestedVersion} carregado para sua revisão. Edite como preferir e clique em Publicar para Todos quando aprovar.`,
    });
  };

  const handleSaveDraft = async () => {
    setStatusBanner(null);
    const err = validatePatchDraft(draft);
    if (err) {
      setStatusBanner({ type: 'error', message: err });
      return;
    }
    setBusyAction('save');
    try {
      await saveAdminDraft(draft);
      setDraftDirty(false);
      setHasRemoteDraft(true);
      setStatusBanner({
        type: 'success',
        message: 'Rascunho privado salvo na nuvem! Apenas você pode vê-lo até clicar em Publicar para Todos.',
      });
    } catch (error) {
      setStatusBanner({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível salvar o rascunho.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handlePublishConfirm = async () => {
    setStatusBanner(null);
    const err = validatePatchDraft(draft);
    if (err) {
      setStatusBanner({ type: 'error', message: err });
      setConfirmPublish(false);
      return;
    }
    setBusyAction('publish');
    try {
      if (editingReleaseId) {
        await updatePublishedRelease(editingReleaseId, draft, editingReleaseIsCurrent);
        setStatusBanner({
          type: 'success',
          message: `Notas da versão ${draft.version.trim()} atualizadas para todos os jogadores!`,
        });
        setEditingReleaseId(null);
      } else {
        await publishDraftAsNewRelease(draft, publishedReleases);
        setStatusBanner({
          type: 'success',
          message: `Versão ${draft.version.trim()} publicada ao vivo! Todos os jogadores já podem ver esta atualização.`,
        });
      }
      setDraftDirty(false);
      setConfirmPublish(false);
      setAdminView('public');
    } catch (error) {
      setStatusBanner({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Erro ao publicar notas de atualização.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleStartEditPublished = (release: PatchNoteRelease) => {
    if (release.isLocalFallback) {
      setEditingReleaseId(null);
      setAdminView('draft');
      return;
    }
    setEditingReleaseId(release.id);
    setEditingReleaseIsCurrent(release.isCurrent);
    setDraft({
      version: release.version,
      title: release.title,
      summary: release.summary,
      releaseDate: release.releaseDate,
      entries: release.entries.map((e) => ({ ...e })),
    });
    setDraftDirty(false);
    setConfirmPublish(false);
    setStatusBanner(null);
    setAdminView('draft');
  };

  const handleDeleteRelease = async (releaseId: string) => {
    setBusyAction('delete');
    setStatusBanner(null);
    try {
      await deletePublishedRelease(releaseId);
      setConfirmDeleteId(null);
      setStatusBanner({
        type: 'success',
        message: 'Versão removida do histórico público.',
      });
    } catch (error) {
      setStatusBanner({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Erro ao excluir versão.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleAdminGoogleSignIn = async () => {
    setBusyAction('auth');
    setStatusBanner(null);
    try {
      const user = await signInAdminWithGoogle();
      if (isAdminUser(user)) {
        setStatusBanner({
          type: 'success',
          message: 'Conta Google de administrador verificada. Modo de edição liberado.',
        });
        setAdminView('draft');
      } else {
        setStatusBanner({
          type: 'error',
          message: `A conta ${user.email || 'selecionada'} não possui permissão de administrador. Apenas ${ADMIN_EMAIL} pode editar e publicar notas.`,
        });
      }
    } catch (error) {
      setStatusBanner({
        type: 'error',
        message:
          error instanceof Error
            ? 'Login com Google cancelado ou bloqueado pelo navegador.'
            : 'Falha ao autenticar com Google.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const toggleHistoryItem = (id: string) => {
    setExpandedHistoryIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4 text-xs text-stone-300 leading-relaxed">
      {/* Admin Switcher Bar (Visible ONLY to verified Google admin) */}
      {adminAuthorized && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-950/35 border border-emerald-500/35">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-emerald-200 leading-tight">
                Painel do Administrador
              </div>
              <div className="text-[10px] text-emerald-300/75 truncate">
                {firebaseUser?.email}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setEditingReleaseId(null);
                setConfirmPublish(false);
                setAdminView('public');
              }}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                adminView === 'public'
                  ? 'bg-amber-500 text-stone-950 shadow'
                  : 'bg-stone-900/90 text-stone-300 hover:bg-stone-800 border border-stone-700'
              }`}
            >
              <Globe size={13} />
              <span>Visão Pública</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setConfirmPublish(false);
                setAdminView('draft');
              }}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                adminView === 'draft'
                  ? 'bg-emerald-500 text-stone-950 shadow'
                  : 'bg-stone-900/90 text-emerald-200 hover:bg-stone-800 border border-emerald-500/40'
              }`}
            >
              <Edit3 size={13} />
              <span>
                {editingReleaseId ? 'Editando Publicada' : 'Rascunho Privado'}
              </span>
              {draftDirty && (
                <span
                  aria-label="Alterações não salvas"
                  className="w-2 h-2 rounded-full bg-amber-300"
                />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Status / Error Feedback Banner */}
      {statusBanner && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-2 ${
            statusBanner.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/45 text-emerald-200'
              : statusBanner.type === 'error'
              ? 'bg-rose-950/60 border-rose-500/45 text-rose-200'
              : 'bg-sky-950/60 border-sky-500/45 text-sky-200'
          }`}
        >
          <span>{statusBanner.message}</span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-current opacity-70 hover:opacity-100 text-[11px] font-bold px-1.5 cursor-pointer shrink-0"
          >
            Fechar
          </button>
        </div>
      )}

      {publicError && (
        <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/35 text-amber-200 text-[11px]">
          {publicError}
        </div>
      )}

      {/* ================================================================ */}
      {/* VIEW A: PUBLIC PATCH NOTES (ALL PLAYERS + ADMIN PREVIEW)         */}
      {/* ================================================================ */}
      {adminView === 'public' && (
        <div className="space-y-4">
          {loadingPublic ? (
            <div className="flex items-center justify-center gap-2 py-10 text-stone-400">
              <Loader2 size={18} className="animate-spin text-amber-400" />
              <span>Carregando notas de atualização...</span>
            </div>
          ) : (
            <>
              {/* Admin Pending Approval Hint whenever suggested version (v1.5.0) is not yet published */}
              {adminAuthorized && hasUnpublishedSuggestedRelease && (
                <div className="p-3 rounded-xl bg-amber-950/45 border border-amber-400/45 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-amber-100">
                    <strong className="text-amber-300">
                      Rascunho {suggestedVersion} aguardando sua aprovação!
                    </strong>{' '}
                    Todas as mudanças recentes foram documentadas no rascunho privado. Revise os itens e publique apenas quando aprovar.
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadSuggestedDraft}
                    className="min-h-[36px] px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-[11px] uppercase tracking-wider cursor-pointer shrink-0"
                  >
                    Revisar {suggestedVersion}
                  </button>
                </div>
              )}

              {/* CURRENT ACTIVE VERSION HERO CARD */}
              <section className="relative overflow-hidden rounded-2xl border border-amber-500/45 bg-gradient-to-br from-[#17120c] via-stone-950 to-[#0c1120] p-4 sm:p-5 shadow-[0_12px_36px_rgba(0,0,0,0.65)] space-y-4">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0 inset-x-10 h-[2px] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent"
                />

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500 text-stone-950 font-mono font-black text-xs tracking-wide shadow">
                        {currentRelease.version}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                        <Sparkles size={11} />
                        Versão Atual
                      </span>
                      {currentRelease.releaseDate && (
                        <span className="text-[11px] font-mono text-stone-400">
                          {currentRelease.releaseDate}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-serif font-bold text-amber-100 leading-snug pt-0.5">
                      {currentRelease.title}
                    </h3>
                  </div>

                  {adminAuthorized && !currentRelease.isLocalFallback && (
                    <button
                      type="button"
                      onClick={() => handleStartEditPublished(currentRelease)}
                      className="min-h-[34px] px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-amber-500/40 text-amber-200 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Edit3 size={12} />
                      <span>Editar</span>
                    </button>
                  )}
                </div>

                {currentRelease.summary && (
                  <p className="text-xs text-stone-300/95 bg-black/35 p-3 rounded-xl border border-white/5 leading-relaxed">
                    {currentRelease.summary}
                  </p>
                )}

                {/* Categorized Entries List */}
                <div className="space-y-2">
                  {currentRelease.entries.map((entry) => {
                    const meta = PATCH_CATEGORY_META[entry.category] || PATCH_CATEGORY_META.feature;
                    return (
                      <div
                        key={entry.id}
                        className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-900/75 border border-white/5"
                      >
                        <span
                          className={`shrink-0 mt-0.5 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${meta.badgeClass}`}
                        >
                          {meta.shortLabel}
                        </span>
                        <span className="text-xs text-stone-200 leading-relaxed">
                          {entry.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* HISTORICAL VERSIONS ACCORDION */}
              {historyReleases.length > 0 && (
                <section className="space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-300/90 font-bold text-xs uppercase tracking-wider pt-1">
                    <History size={14} className="text-amber-400" />
                    <span>Histórico de Atualizações ({historyReleases.length})</span>
                  </div>

                  <div className="space-y-2">
                    {historyReleases.map((release) => {
                      const isExpanded = Boolean(expandedHistoryIds[release.id]);
                      const isConfirmingDelete = confirmDeleteId === release.id;

                      return (
                        <div
                          key={release.id}
                          className="rounded-xl border border-white/10 bg-stone-900/60 overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() => toggleHistoryItem(release.id)}
                            className="w-full flex items-center justify-between gap-2 px-3.5 py-3 text-left hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                              <span className="px-2 py-0.5 rounded bg-stone-800 border border-stone-600 text-amber-200 font-mono font-bold text-[11px]">
                                {release.version}
                              </span>
                              <span className="font-bold text-stone-200 truncate">
                                {release.title}
                              </span>
                              {release.releaseDate && (
                                <span className="text-[10px] font-mono text-stone-400">
                                  · {release.releaseDate}
                                </span>
                              )}
                            </div>
                            <div className="text-stone-400 shrink-0">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="px-3.5 pb-3.5 pt-1 border-t border-white/5 space-y-2.5">
                              {release.summary && (
                                <p className="text-[11px] text-stone-400">{release.summary}</p>
                              )}

                              <div className="space-y-1.5">
                                {release.entries.map((entry) => {
                                  const meta =
                                    PATCH_CATEGORY_META[entry.category] ||
                                    PATCH_CATEGORY_META.feature;
                                  return (
                                    <div
                                      key={entry.id}
                                      className="flex items-start gap-2 text-[11px] text-stone-300"
                                    >
                                      <span
                                        className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase ${meta.badgeClass}`}
                                      >
                                        {meta.shortLabel}
                                      </span>
                                      <span>{entry.text}</span>
                                    </div>
                                  );
                                })}
                              </div>

                              {adminAuthorized && !release.isLocalFallback && (
                                <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-end gap-2">
                                  {isConfirmingDelete ? (
                                    <>
                                      <span className="text-[11px] text-rose-300 mr-auto">
                                        Excluir esta versão do histórico?
                                      </span>
                                      <button
                                        type="button"
                                        disabled={busyAction === 'delete'}
                                        onClick={() => handleDeleteRelease(release.id)}
                                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold cursor-pointer"
                                      >
                                        Confirmar Exclusão
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] cursor-pointer"
                                      >
                                        Cancelar
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleStartEditPublished(release)}
                                        className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                      >
                                        <Edit3 size={12} />
                                        <span>Editar</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(release.id)}
                                        className="px-2.5 py-1 rounded-lg bg-rose-950/70 hover:bg-rose-900/80 border border-rose-500/35 text-rose-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                      >
                                        <Trash2 size={12} />
                                        <span>Remover</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* VIEW B: ADMIN PRIVATE DRAFT / RELEASE EDITOR                     */}
      {/* ================================================================ */}
      {adminAuthorized && adminView === 'draft' && (
        <section className="rounded-2xl border border-emerald-500/40 bg-stone-900/80 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-emerald-400 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-emerald-200">
                  {editingReleaseId
                    ? `Editando Versão Publicada (${draft.version})`
                    : 'Editor de Rascunho Privado'}
                </h3>
                <p className="text-[11px] text-stone-400">
                  {editingReleaseId
                    ? 'As alterações serão aplicadas diretamente nesta versão do histórico público.'
                    : hasRemoteDraft && draft.updatedAtMs
                    ? `Rascunho salvo na nuvem em ${formatSavedTime(draft.updatedAtMs)} — invisível para jogadores até publicar.`
                    : 'Esboço inicial pré-carregado com suas mudanças recentes. Só você pode ver este rascunho.'}
                </p>
              </div>
            </div>

            {!editingReleaseId && (
              <button
                type="button"
                onClick={handleLoadSuggestedDraft}
                className="min-h-[34px] px-2.5 py-1 rounded-lg bg-stone-950 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-amber-200 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
                title={`Carregar o esboço preparado para a versão ${suggestedVersion}`}
              >
                <RotateCcw size={12} />
                <span>Carregar Esboço {suggestedVersion}</span>
              </button>
            )}
          </div>

          {!editingReleaseId && hasUnpublishedSuggestedRelease && !isDraftMatchingSuggested && (
            <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-400/45 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-amber-100">
                O rascunho salvo está na versão <strong className="font-mono text-amber-300">{draft.version}</strong>. Há um novo esboço pronto da <strong className="font-mono text-amber-300">{suggestedVersion}</strong> aguardando sua aprovação.
              </span>
              <button
                type="button"
                onClick={handleLoadSuggestedDraft}
                className="min-h-[32px] px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-[11px] cursor-pointer shrink-0"
              >
                Carregar {suggestedVersion}
              </button>
            </div>
          )}

          {/* Core Metadata Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                Versão *
              </label>
              <input
                type="text"
                maxLength={24}
                value={draft.version}
                onChange={(e) => updateDraftField('version', e.target.value)}
                placeholder="v1.4.0"
                className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 focus:border-amber-400 focus:outline-none text-amber-200 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                Data *
              </label>
              <input
                type="text"
                maxLength={32}
                value={draft.releaseDate}
                onChange={(e) => updateDraftField('releaseDate', e.target.value)}
                placeholder="21/11/2026"
                className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 focus:border-amber-400 focus:outline-none text-stone-200 font-mono text-xs"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                Título da Atualização * ({draft.title.length}/120)
              </label>
              <input
                type="text"
                maxLength={120}
                value={draft.title}
                onChange={(e) => updateDraftField('title', e.target.value)}
                placeholder="Ex: Arena Mobile Reformulada & Tutorial Interativo"
                className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 focus:border-amber-400 focus:outline-none text-stone-100 text-xs font-semibold"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                Resumo Geral ({draft.summary.length}/800)
              </label>
              <textarea
                rows={2}
                maxLength={800}
                value={draft.summary}
                onChange={(e) => updateDraftField('summary', e.target.value)}
                placeholder="Resumo curto dos destaques desta atualização..."
                className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 focus:border-amber-400 focus:outline-none text-stone-200 text-xs resize-y"
              />
            </div>
          </div>

          {/* Dynamic Entries Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                Lista de Mudanças ({draft.entries.length}/40)
              </span>
              <button
                type="button"
                onClick={() => addEntry('feature')}
                className="min-h-[34px] px-2.5 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/70 border border-emerald-500/45 text-emerald-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} />
                <span>Adicionar Item</span>
              </button>
            </div>

            <div className="space-y-2">
              {draft.entries.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="p-2.5 rounded-xl bg-stone-950/90 border border-stone-800 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <select
                      value={entry.category}
                      onChange={(e) =>
                        updateEntry(idx, { category: e.target.value as PatchCategory })
                      }
                      className="px-2 py-1 rounded-md bg-stone-900 border border-stone-700 text-[11px] font-bold text-stone-200 focus:border-amber-400 focus:outline-none cursor-pointer"
                    >
                      <option value="feature">Novidade</option>
                      <option value="balance">Balanceamento</option>
                      <option value="ui_mobile">Visual & Mobile</option>
                      <option value="fix">Correção</option>
                    </select>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-mono text-stone-500 mr-1">
                        {entry.text.length}/280
                      </span>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveEntry(idx, -1)}
                        className="p-1 rounded bg-stone-900 hover:bg-stone-800 disabled:opacity-30 text-stone-300 cursor-pointer"
                        title="Mover para cima"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === draft.entries.length - 1}
                        onClick={() => moveEntry(idx, 1)}
                        className="p-1 rounded bg-stone-900 hover:bg-stone-800 disabled:opacity-30 text-stone-300 cursor-pointer"
                        title="Mover para baixo"
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeEntry(idx)}
                        className="p-1 rounded bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 cursor-pointer"
                        title="Remover item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    maxLength={280}
                    value={entry.text}
                    onChange={(e) => updateEntry(idx, { text: e.target.value })}
                    placeholder="Descreva a melhoria, ajuste ou correção..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-stone-900/90 border border-stone-800 focus:border-amber-400 focus:outline-none text-stone-200 text-xs resize-y"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Inline Publish Confirmation Strip */}
          {confirmPublish && (
            <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-400/60 space-y-2">
              <div className="text-xs font-bold text-amber-200">
                {editingReleaseId
                  ? `Salvar alterações públicas na versão ${draft.version.trim()}?`
                  : `Publicar ${draft.version.trim()} para todos os jogadores agora?`}
              </div>
              <p className="text-[11px] text-amber-100/85">
                {editingReleaseId
                  ? 'A versão atualizada aparecerá imediatamente para todos os jogadores.'
                  : 'Esta versão se tornará a Versão Atual oficial para todos os jogadores e a versão anterior será movida automaticamente para o Histórico.'}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={busyAction === 'publish'}
                  onClick={handlePublishConfirm}
                  className="min-h-[38px] px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {busyAction === 'publish' ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  <span>Confirmar Publicação</span>
                </button>
                <button
                  type="button"
                  disabled={busyAction === 'publish'}
                  onClick={() => setConfirmPublish(false)}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Editor Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
            {editingReleaseId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingReleaseId(null);
                  setConfirmPublish(false);
                  setAdminView('public');
                }}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs cursor-pointer"
              >
                Cancelar Edição
              </button>
            ) : (
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={handleSaveDraft}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-emerald-500/45 text-emerald-200 font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {busyAction === 'save' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                <span>Salvar Rascunho (Privado)</span>
              </button>
            )}

            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => {
                const err = validatePatchDraft(draft);
                if (err) {
                  setStatusBanner({ type: 'error', message: err });
                  return;
                }
                setStatusBanner(null);
                setConfirmPublish(true);
              }}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 text-stone-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send size={14} />
              <span>
                {editingReleaseId ? 'Atualizar Nota Pública' : 'Publicar para Todos'}
              </span>
            </button>
          </div>
        </section>
      )}

      {/* Subtle Admin Sign-In Strip (Shown ONLY when user is NOT signed in as verified Google Admin) */}
      {!adminAuthorized && (
        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500">
          <div className="flex items-center gap-1.5">
            <Lock size={12} className="text-stone-500" />
            <span>
              Notas sincronizadas em tempo real para todos os jogadores.
            </span>
          </div>

          <button
            type="button"
            disabled={busyAction === 'auth'}
            onClick={handleAdminGoogleSignIn}
            className="min-h-[34px] px-3 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-amber-500/45 text-stone-300 hover:text-amber-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
          >
            {busyAction === 'auth' ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <ShieldCheck size={12} />
            )}
            <span>Entrar como Admin (Google)</span>
          </button>
        </div>
      )}
    </div>
  );
};
