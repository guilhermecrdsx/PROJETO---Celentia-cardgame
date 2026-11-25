import React, { useState } from 'react';
import { Shield, Sparkles, Lock, Mail, User, LogIn, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  loginWithCredentials,
  registerWithCredentials,
  loginWithGooglePopup,
  CloudPlayerStateDTO,
} from '../services/accountApi';
import { sound } from '../services/soundEffects';
import { sanitizeHandleDraft, validateHandle } from '../utils/nickname';

interface AuthModalProps {
  isOpen: boolean;
  onAuthenticated?: (player: CloudPlayerStateDTO) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onAuthenticated }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (activeTab === 'login') {
        const player = await loginWithCredentials(identifier.trim(), password);
        sound.playSpell();
        onAuthenticated?.(player);
      } else {
        if (password !== confirmPassword) {
          setErrorMsg('As senhas informadas não coincidem.');
          setLoading(false);
          return;
        }
        const nickCheck = validateHandle(nickname);
        if (!nickCheck.valid) {
          setErrorMsg(nickCheck.error || 'Informe um @nick válido.');
          setLoading(false);
          return;
        }
        const player = await registerWithCredentials(
          email.trim(),
          nickCheck.normalized,
          password
        );
        sound.playSpell();
        onAuthenticated?.(player);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Não foi possível autenticar sua conta.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const player = await loginWithGooglePopup();
      sound.playSpell();
      onAuthenticated?.(player);
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMsg('A janela de login com Google foi fechada antes da conclusão.');
      } else {
        setErrorMsg(err?.message || 'Falha ao autenticar com o Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (quickId: string, quickPass: string) => {
    setErrorMsg(null);
    setLoading(true);
    setActiveTab('login');
    setIdentifier(quickId);
    setPassword(quickPass);
    try {
      const player = await loginWithCredentials(quickId, quickPass);
      sound.playSpell();
      onAuthenticated?.(player);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha ao autenticar perfil de teste.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/88 backdrop-blur-md animate-fadeIn select-none">
      {/* Ambient sanctuary glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[520px] h-[520px] bg-amber-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[520px] h-[520px] bg-cyan-600/15 rounded-full blur-[140px]" />
      </div>

      {/* Main Sculpted Stone Modal */}
      <div
        className="relative z-10 w-full max-w-4xl max-h-[94dvh] flex flex-col rounded-3xl bg-slate-950/95 border-4 border-stone-700 shadow-[0_0_60px_rgba(0,0,0,0.95)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Corner Runic Diamond Gems */}
        <div className="absolute top-2 left-2 w-3.5 h-3.5 bg-amber-400 rotate-45 border border-white shadow-[0_0_10px_#f59e0b] pointer-events-none z-20" />
        <div className="absolute top-2 right-2 w-3.5 h-3.5 bg-amber-400 rotate-45 border border-white shadow-[0_0_10px_#f59e0b] pointer-events-none z-20" />
        <div className="absolute bottom-2 left-2 w-3.5 h-3.5 bg-cyan-400 rotate-45 border border-white shadow-[0_0_10px_#38bdf8] pointer-events-none z-20" />
        <div className="absolute bottom-2 right-2 w-3.5 h-3.5 bg-cyan-400 rotate-45 border border-white shadow-[0_0_10px_#38bdf8] pointer-events-none z-20" />

        {/* Header Bar */}
        <div className="relative w-full py-4 px-6 flex flex-col items-center justify-center border-b-2 border-stone-800 bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-cyan-300/90 mb-1">
            <span>ᚦ ᚱ ᛞ</span>
            <span>Santuário Real de Celentia · Cloud Save</span>
            <span>ᛗ ᛚ ᛊ</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)] text-center">
            PORTAL DO DUELISTA
          </h2>
        </div>

        {/* Two-Column Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: Lore & Cloud Benefits (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl bg-stone-900/90 border-2 border-stone-700/90 p-5 shadow-inner">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-900/40 border-2 border-amber-400/70 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                  <Shield className="text-amber-300" size={24} />
                </div>
                <div>
                  <h3 className="font-serif font-black text-base tracking-wider text-amber-200 uppercase">
                    Progresso Salvo na Nuvem
                  </h3>
                  <p className="text-xs text-stone-400">
                    PostgreSQL + Autenticação Criptografada
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed mb-5">
                Vincule seu perfil aos arquivos reais de <strong className="text-amber-300">Celentia</strong>. Suas cartas desbloqueadas, decks personalizados, saldo de Ouro, nível e histórico de batalhas ficam sincronizados em tempo real.
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-950/80 border border-stone-800">
                  <CheckCircle2 size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-stone-300">
                    <span className="font-bold text-amber-200">Bônus Inicial de Conta:</span> Comece com <span className="text-amber-300 font-mono font-bold">1.000 Ouro</span> e o Baralho Inicial de 20 cartas liberado.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-950/80 border border-stone-800">
                  <CheckCircle2 size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-stone-300">
                    <span className="font-bold text-cyan-200">Coleção & Baú Real:</span> Desbloqueie novas cartas usando Ouro conquistado em partidas ou abra o Baú Real (300 Ouro).
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-950/80 border border-stone-800">
                  <CheckCircle2 size={16} className="text-purple-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-stone-300">
                    <span className="font-bold text-purple-200">Save State Otimizado:</span> Sincronização automática ao concluir partidas, editar baralhos ou desbloquear cartas.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Auth Tabs & Form (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl bg-stone-900/90 border-2 border-stone-700 p-5 sm:p-6 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
            <div>
              {/* Mode Selector Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-stone-950 border border-stone-800 mb-5">
                <button
                  type="button"
                  onClick={() => {
                    sound.playDraw();
                    setActiveTab('login');
                    setErrorMsg(null);
                  }}
                  className={`py-2.5 px-4 rounded-xl font-serif font-black text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'login'
                      ? 'bg-gradient-to-b from-amber-500 to-amber-700 text-stone-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <LogIn size={16} />
                  <span>Entrar na Conta</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playDraw();
                    setActiveTab('register');
                    setErrorMsg(null);
                  }}
                  className={`py-2.5 px-4 rounded-xl font-serif font-black text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'register'
                      ? 'bg-gradient-to-b from-cyan-500 to-blue-700 text-white shadow-[0_0_15px_rgba(56,189,248,0.4)]'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <UserPlus size={16} />
                  <span>Criar Nova Conta</span>
                </button>
              </div>

              {/* Error Banner */}
              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/70 flex items-center gap-2.5 text-xs text-rose-200">
                  <AlertCircle size={16} className="text-rose-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Credentials Form */}
              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                {activeTab === 'login' ? (
                  <div>
                    <label className="block text-xs font-serif font-bold uppercase tracking-wider text-amber-200/90 mb-1.5">
                      E-mail ou @Nick
                    </label>
                    <div className="relative">
                      <User
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500"
                      />
                      <input
                        type="text"
                        required
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="seu@email.com ou @seunick"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-950 border-2 border-stone-700 focus:border-amber-400 text-sm text-stone-100 placeholder-stone-600 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-serif font-bold uppercase tracking-wider text-amber-200/90 mb-1.5">
                        E-mail
                      </label>
                      <div className="relative">
                        <Mail
                          size={16}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500"
                        />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="duelista@celentia.com"
                          className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-stone-950 border-2 border-stone-700 focus:border-cyan-400 text-sm text-stone-100 placeholder-stone-600 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-serif font-bold uppercase tracking-wider text-amber-200/90 mb-1.5">
                        @Nick Único no Jogo
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400 font-mono font-black text-sm">
                          @
                        </span>
                        <input
                          type="text"
                          required
                          maxLength={17}
                          value={nickname.replace(/^@+/, '')}
                          onChange={(e) =>
                            setNickname(sanitizeHandleDraft(e.target.value))
                          }
                          placeholder="arcanista"
                          className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-stone-950 border-2 border-stone-700 focus:border-cyan-400 text-sm font-mono text-stone-100 placeholder-stone-600 focus:outline-none transition-colors"
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-stone-400">
                        Formato <span className="text-cyan-300 font-mono">@nick</span> · único, sem espaços
                      </p>
                    </div>
                  </div>
                )}

                <div className={activeTab === 'register' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3.5' : ''}>
                  <div>
                    <label className="block text-xs font-serif font-bold uppercase tracking-wider text-amber-200/90 mb-1.5">
                      Senha
                    </label>
                    <div className="relative">
                      <Lock
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500"
                      />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo de 6 caracteres"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-950 border-2 border-stone-700 focus:border-amber-400 text-sm text-stone-100 placeholder-stone-600 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {activeTab === 'register' && (
                    <div>
                      <label className="block text-xs font-serif font-bold uppercase tracking-wider text-amber-200/90 mb-1.5">
                        Confirmar Senha
                      </label>
                      <div className="relative">
                        <Lock
                          size={16}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500"
                        />
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repita sua senha"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-950 border-2 border-stone-700 focus:border-cyan-400 text-sm text-stone-100 placeholder-stone-600 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 px-6 rounded-2xl font-serif font-black text-sm tracking-widest uppercase border-2 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50 ${
                    activeTab === 'login'
                      ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-stone-950 border-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.4)]'
                      : 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white border-cyan-300 shadow-[0_0_25px_rgba(56,189,248,0.4)]'
                  }`}
                >
                  <Sparkles size={16} />
                  <span>
                    {loading
                      ? 'Sincronizando com o Reino...'
                      : activeTab === 'login'
                        ? 'Entrar em Celentia'
                        : 'Registrar & Receber 1.000 Ouro'}
                  </span>
                </button>
              </form>
            </div>

            {/* Divider & Google OAuth Button */}
            <div className="mt-5">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-stone-800" />
                <span className="flex-shrink mx-3 text-[11px] font-mono uppercase tracking-widest text-stone-500">
                  ou acesse com 1 clique
                </span>
                <div className="flex-grow border-t border-stone-800" />
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleLogin}
                className="mt-2 w-full py-2.5 px-5 rounded-2xl bg-stone-950 hover:bg-stone-800 border-2 border-stone-700 hover:border-amber-400/70 text-stone-100 font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.8z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 20.9 7.4 24 12 24z"
                  />
                </svg>
                <span>Continuar com Conta Google</span>
              </button>

              {/* Quick Test Profiles (Admin & New Player) - Dev Only */}
              {import.meta.env.DEV && (
                <div className="mt-4 pt-3 border-t border-stone-800/90">
                  <div className="flex items-center justify-between text-[11px] font-mono text-stone-400 mb-2">
                    <span>⚡ PERFIS PRONTOS PARA TESTE:</span>
                    <span className="text-amber-300/80">1 Clique</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleQuickLogin('@admin', 'admin123')}
                      className="py-2 px-3 rounded-xl bg-amber-950/50 hover:bg-amber-900/70 border border-amber-500/60 text-amber-200 text-xs font-bold flex flex-col items-start transition-all cursor-pointer disabled:opacity-50"
                      title="Login: @admin | Senha: admin123"
                    >
                      <span className="flex items-center gap-1.5 text-amber-300 font-serif font-black">
                        👑 Perfil @admin (Full)
                      </span>
                      <span className="text-[10px] font-mono text-stone-300">
                        @admin / admin123 · 100% Cartas & 99k 🪙
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleQuickLogin('@novato', '123456')}
                      className="py-2 px-3 rounded-xl bg-cyan-950/50 hover:bg-cyan-900/70 border border-cyan-500/60 text-cyan-200 text-xs font-bold flex flex-col items-start transition-all cursor-pointer disabled:opacity-50"
                      title="Login: @novato | Senha: 123456"
                    >
                      <span className="flex items-center gap-1.5 text-cyan-300 font-serif font-black">
                        ⚔️ Perfil @novato
                      </span>
                      <span className="text-[10px] font-mono text-stone-300">
                        @novato / 123456 · Nv.1 & Decks Iniciais
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
