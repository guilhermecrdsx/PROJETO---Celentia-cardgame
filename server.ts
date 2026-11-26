import http from 'http';
import fs from 'fs';
import express from 'express';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { setupPvpWebSocketServer } from './src/server/pvpServer.ts';
import {
  normalizeRankTierInput,
  type RankPolicyConfig,
} from './src/utils/rankMath.ts';
import { type PackType, PACK_MAP } from './src/data/packs.ts';
import type { CurrencyType } from './src/data/economy.ts';
import {
  type AuthRequest,
  requireAuth,
  signPlayerJwt,
} from './src/middleware/auth.ts';
import {
  adminDeliverAvatarToUser,
  adminDeliverCardToUser,
  adminExecuteActionOnTargetUser,
  adminGrantResourcesToUser,
  adminListUsers,
  adminUpdateUserProfile,
  buildPlayerStateDTO,
  claimTutorialRewardByUid,
  ensureSeededTestProfiles,
  executeAdminActionByUid,
  findUserForLogin,
  getOrCreateGoogleUser,
  getPlayerStateByUidOrEmail,
  getPublicPlayerProfileByIdentifier,
  getGlobalLeaderboard,
  isUserAdminAccount,
  migrateExistingNicknamesToHandles,
  openCardPackByUid,
  recordCompletedMatchByUid,
  registerUserWithPassword,
  savePlayerDeckSlotByUid,
  searchPublicPlayers,
  unlockAvatarByUid,
  unlockCardBackByUid,
  unlockCardByUid,
  unlockPlaymatByUid,
  updatePlayerProfileByUid,
} from './src/db/playerRepository.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '1mb' }));

  void (async () => {
    try {
      if (process.env.NODE_ENV !== 'production') {
        const [adminHash, starterHash] = await Promise.all([
          bcrypt.hash('admin123', 10),
          bcrypt.hash('123456', 10),
        ]);
        await ensureSeededTestProfiles(adminHash, starterHash);
      }
      await migrateExistingNicknamesToHandles();
    } catch (err) {
      console.error('Failed during startup user seeding/handle migration:', err);
    }
  })();

  // Global Game Mode Queue Availability State (persisted on disk + synced with Firestore by Admin client + enforced server-side)
  type QueueId = 'pvp_ranked' | 'pvp_normal' | 'pvia' | 'testing_arena' | 'tutorial';
  const QUEUE_IDS: QueueId[] = ['pvp_ranked', 'pvp_normal', 'pvia', 'testing_arena', 'tutorial'];
  const MODE_QUEUES_FILE = path.join(__dirname, '.mode-queues-state.json');

  const createDefaultModeQueues = (): Record<QueueId, { enabled: boolean; reason: string }> => ({
    pvp_ranked: { enabled: true, reason: '' },
    pvp_normal: { enabled: true, reason: '' },
    pvia: { enabled: true, reason: '' },
    testing_arena: { enabled: true, reason: '' },
    tutorial: { enabled: true, reason: '' },
  });

  let modeQueuesState: Record<QueueId, { enabled: boolean; reason: string }> =
    createDefaultModeQueues();
  let modeQueuesUpdatedAtMs = 0;

  try {
    if (fs.existsSync(MODE_QUEUES_FILE)) {
      const rawFile = fs.readFileSync(MODE_QUEUES_FILE, 'utf-8');
      const parsedFile = JSON.parse(rawFile);
      if (parsedFile && typeof parsedFile === 'object' && parsedFile.queues) {
        const loaded = createDefaultModeQueues();
        for (const id of QUEUE_IDS) {
          const entry = parsedFile.queues[id];
          if (entry && typeof entry === 'object') {
            loaded[id] = {
              enabled: typeof entry.enabled === 'boolean' ? entry.enabled : true,
              reason:
                typeof entry.reason === 'string'
                  ? entry.reason.trim().slice(0, 140)
                  : '',
            };
          }
        }
        modeQueuesState = loaded;
        modeQueuesUpdatedAtMs =
          typeof parsedFile.updatedAtMs === 'number' ? parsedFile.updatedAtMs : Date.now();
      }
    }
  } catch (err) {
    console.warn('Could not load persisted mode queues state, using defaults:', err);
  }

  const persistModeQueuesToDisk = () => {
    try {
      fs.writeFileSync(
        MODE_QUEUES_FILE,
        JSON.stringify(
          { queues: modeQueuesState, updatedAtMs: modeQueuesUpdatedAtMs },
          null,
          2
        ),
        'utf-8'
      );
    } catch (err) {
      console.warn('Could not persist mode queues state to disk:', err);
    }
  };

  // Global Rank Lock Policy (persisted on disk + synced with Firestore by Admin client + enforced across server/PvP)
  const RANK_POLICY_FILE = path.join(__dirname, '.rank-policy-state.json');
  let rankPolicyState: RankPolicyConfig = { blockedFromTier: null };
  let rankPolicyUpdatedAtMs = 0;

  try {
    if (fs.existsSync(RANK_POLICY_FILE)) {
      const rawPolicy = fs.readFileSync(RANK_POLICY_FILE, 'utf-8');
      const parsedPolicy = JSON.parse(rawPolicy);
      if (parsedPolicy && typeof parsedPolicy === 'object') {
        const rawBlocked =
          parsedPolicy.policy && typeof parsedPolicy.policy === 'object'
            ? parsedPolicy.policy.blockedFromTier
            : parsedPolicy.blockedFromTier;
        rankPolicyState = {
          blockedFromTier: normalizeRankTierInput(rawBlocked),
        };
        rankPolicyUpdatedAtMs =
          typeof parsedPolicy.updatedAtMs === 'number' ? parsedPolicy.updatedAtMs : Date.now();
      }
    }
  } catch (err) {
    console.warn('Could not load persisted rank policy state, using defaults:', err);
  }

  const persistRankPolicyToDisk = () => {
    try {
      fs.writeFileSync(
        RANK_POLICY_FILE,
        JSON.stringify(
          { policy: rankPolicyState, updatedAtMs: rankPolicyUpdatedAtMs },
          null,
          2
        ),
        'utf-8'
      );
    } catch (err) {
      console.warn('Could not persist rank policy state to disk:', err);
    }
  };

  // Lightweight in-memory rate limiter for auth endpoints
  const authRateMap = new Map<string, { count: number; resetAt: number }>();
  const AUTH_RATE_WINDOW_MS = 15 * 60 * 1000;
  const AUTH_RATE_MAX_REQUESTS = 25;

  const authRateLimit: express.RequestHandler = (req, res, next) => {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0])?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const now = Date.now();

    if (authRateMap.size > 5000) {
      for (const [key, entry] of authRateMap.entries()) {
        if (entry.resetAt <= now) authRateMap.delete(key);
      }
    }

    const record = authRateMap.get(clientIp);
    if (!record || record.resetAt <= now) {
      authRateMap.set(clientIp, { count: 1, resetAt: now + AUTH_RATE_WINDOW_MS });
      return next();
    }

    if (record.count >= AUTH_RATE_MAX_REQUESTS) {
      return res.status(429).json({
        error: 'Muitas tentativas em sequência. Aguarde alguns minutos antes de tentar novamente.',
      });
    }

    record.count += 1;
    return next();
  };

  // ============================================================================
  // 1. AUTHENTICATION ROUTES (Email/Nickname + Password Hash + JWT & Google OAuth)
  // ============================================================================

  app.post('/api/auth/register', authRateLimit, async (req, res) => {
    try {
      const { email, nickname, password } = req.body || {};
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'Informe um endereço de e-mail válido.' });
      }
      if (!nickname || typeof nickname !== 'string' || nickname.trim().length < 2) {
        return res.status(400).json({ error: 'O Nickname deve ter pelo menos 2 caracteres.' });
      }
      if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'A senha deve possuir no mínimo 6 caracteres.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const player = await registerUserWithPassword(email, nickname, passwordHash);
      const token = signPlayerJwt({
        uid: player.uid,
        email: player.email,
        nickname: player.nickname,
      });

      return res.status(201).json({ token, player });
    } catch (error: any) {
      if (error?.message === 'EMAIL_ALREADY_EXISTS') {
        return res.status(409).json({
          error: 'Este e-mail já está cadastrado. Faça login ou utilize outra conta.',
        });
      }
      if (error?.message === 'NICKNAME_ALREADY_EXISTS') {
        return res.status(409).json({
          error: 'Este @nick já está em uso por outro duelista. Escolha um @nick único.',
        });
      }
      if (typeof error?.message === 'string' && error.message.startsWith('INVALID_NICKNAME:')) {
        return res.status(400).json({
          error: error.message.slice('INVALID_NICKNAME:'.length),
        });
      }
      console.error('Failed in POST /api/auth/register:', error);
      return res.status(500).json({
        error: error?.message || 'Não foi possível concluir o cadastro no momento.',
      });
    }
  });

  app.post('/api/auth/login', authRateLimit, async (req, res) => {
    try {
      const { identifier, password } = req.body || {};
      if (!identifier || typeof identifier !== 'string' || !password || typeof password !== 'string') {
        return res.status(400).json({ error: 'Informe seu e-mail/nickname e sua senha.' });
      }

      const userRow = await findUserForLogin(identifier);
      if (!userRow) {
        return res.status(401).json({ error: 'Conta não encontrada. Verifique o e-mail ou nickname.' });
      }

      if (!userRow.passwordHash) {
        return res.status(401).json({
          error: 'Esta conta foi criada com o Google. Use o botão "Entrar com Google".',
        });
      }

      const validPassword = await bcrypt.compare(password, userRow.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Senha incorreta. Tente novamente.' });
      }

      const player = await buildPlayerStateDTO(userRow);
      const token = signPlayerJwt({
        uid: player.uid,
        email: player.email,
        nickname: player.nickname,
      });

      return res.json({ token, player });
    } catch (error: any) {
      console.error('Failed in POST /api/auth/login:', error);
      return res.status(500).json({
        error: error?.message || 'Erro ao autenticar jogador.',
      });
    }
  });

  app.post('/api/auth/google', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }
      const displayName =
        typeof req.body?.displayName === 'string' && req.body.displayName.trim()
          ? req.body.displayName.trim()
          : req.user.nickname;
      const player = await getOrCreateGoogleUser(
        req.user.uid,
        req.user.email,
        displayName
      );
      return res.json({ player });
    } catch (error: any) {
      console.error('Failed in POST /api/auth/google:', error);
      return res.status(500).json({
        error: error?.message || 'Falha ao sincronizar login Google.',
      });
    }
  });

  // ============================================================================
  // 2. PLAYER CLOUD STATE & PROGRESSION ROUTES
  // ============================================================================

  app.get('/api/player/state', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }
      const player = await getPlayerStateByUidOrEmail(
        req.user.uid,
        req.user.email,
        req.user.nickname
      );
      return res.json({ player });
    } catch (error: any) {
      console.error('Failed in GET /api/player/state:', error);
      return res.status(500).json({
        error: error?.message || 'Falha ao carregar dados salvos da nuvem.',
      });
    }
  });

  app.put('/api/player/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }
      const { nickname, preferredSide, avatarId, equippedPlaymat, equippedCardBack } = req.body || {};
      const player = await updatePlayerProfileByUid(
        req.user.uid,
        {
          nickname,
          preferredSide,
          avatarId,
          equippedPlaymat,
          equippedCardBack,
        },
        req.user.email
      );
      return res.json({ player });
    } catch (error: any) {
      if (error?.message === 'NICKNAME_ALREADY_EXISTS') {
        return res.status(409).json({
          error: 'Este @nick já está em uso por outro jogador. Escolha outro @nick único.',
        });
      }
      if (error?.message === 'AVATAR_NOT_FOUND') {
        return res.status(404).json({ error: 'Avatar não encontrado no catálogo.' });
      }
      if (error?.message === 'AVATAR_LOCKED') {
        return res.status(403).json({
          error: 'Este avatar ainda não foi desbloqueado na Loja ou liberado pelo Admin.',
        });
      }
      if (error?.message === 'PLAYMAT_NOT_FOUND') {
        return res.status(404).json({ error: 'Tapete de batalha não encontrado no catálogo.' });
      }
      if (error?.message === 'PLAYMAT_LOCKED') {
        return res.status(403).json({
          error: 'Este tapete de batalha ainda não foi desbloqueado na Loja.',
        });
      }
      if (error?.message === 'CARD_BACK_NOT_FOUND') {
        return res.status(404).json({ error: 'Verso de carta não encontrado no catálogo.' });
      }
      if (error?.message === 'CARD_BACK_LOCKED') {
        return res.status(403).json({
          error: 'Este verso de carta ainda não foi desbloqueado na Loja.',
        });
      }
      if (typeof error?.message === 'string' && error.message.startsWith('INVALID_NICKNAME:')) {
        return res.status(400).json({
          error: error.message.slice('INVALID_NICKNAME:'.length),
        });
      }
      console.error('Failed in PUT /api/player/profile:', error);
      return res.status(500).json({
        error: error?.message || 'Falha ao atualizar perfil na nuvem.',
      });
    }
  });

  app.put('/api/player/decks', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }
      const { slotId, name, cardIds, setActive } = req.body || {};
      const parsedSlotId = Number(slotId);

      if (parsedSlotId === 0) {
        const player = await savePlayerDeckSlotByUid(
          req.user.uid,
          {
            slotId: 0,
            name: '',
            cardIds: [],
            setActive: false,
          },
          req.user.email
        );
        return res.json({ player });
      }

      if (
        !Number.isInteger(parsedSlotId) ||
        parsedSlotId < 1 ||
        parsedSlotId > 3 ||
        !Array.isArray(cardIds) ||
        (cardIds.length !== 0 && cardIds.length !== 20) ||
        !cardIds.every((id) => typeof id === 'string')
      ) {
        return res.status(400).json({
          error: 'O baralho deve conter exatamente 20 cartas para ser salvo (ou 0 para esvaziar o espaço).',
        });
      }

      const player = await savePlayerDeckSlotByUid(
        req.user.uid,
        {
          slotId: parsedSlotId,
          name:
            typeof name === 'string' && name.trim()
              ? name
              : cardIds.length === 0
                ? `Espaço Vazio ${parsedSlotId}`
                : `Baralho Personalizado ${parsedSlotId}`,
          cardIds,
          setActive: cardIds.length === 20 && Boolean(setActive),
        },
        req.user.email
      );
      return res.json({ player });
    } catch (error: any) {
      console.error('Failed in PUT /api/player/decks:', error);
      return res.status(500).json({
        error: error?.message || 'Falha ao salvar baralho no banco de dados.',
      });
    }
  });

  app.post('/api/player/unlock-card', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }
      const { cardId, currency } = req.body || {};
      if (!cardId || typeof cardId !== 'string') {
        return res.status(400).json({ error: 'ID da carta inválido.' });
      }
      const normalizedCurrency: CurrencyType = currency === 'crystals' ? 'crystals' : 'gold';

      const result = await unlockCardByUid(req.user.uid, cardId, normalizedCurrency, req.user.email);
      return res.json({
        player: result.state,
        unlockedCardId: result.unlockedCardId,
        costPaid: result.costPaid,
        currency: result.currency,
      });
    } catch (error: any) {
      if (error?.message === 'EVENT_EXCLUSIVE_CARD') {
        return res.status(400).json({
          error:
            'Cartas das classes Divino, Cósmico, Sombrio e Mágico não podem ser compradas na Loja. Elas são liberadas por Passes de Evento ou Premiação de um Admin.',
        });
      }
      if (error?.message === 'CRYSTALS_TIER_LIMIT_EXCEEDED') {
        return res.status(400).json({
          error: 'Apenas cartas até o Tier 3 podem ser compradas com Cristais. Cartas de Tier 4 ou superior exigem Ouro.',
        });
      }
      if (error?.message === 'INSUFFICIENT_CRYSTALS') {
        return res.status(400).json({
          error: 'Cristais insuficientes para desbloquear esta carta. Jogue partidas para acumular mais Cristais!',
        });
      }
      if (error?.message === 'INSUFFICIENT_GOLD') {
        return res.status(400).json({
          error: 'Ouro insuficiente para desbloquear esta carta.',
        });
      }
      if (error?.message === 'CARD_NOT_FOUND') {
        return res.status(404).json({ error: 'Carta não encontrada no catálogo.' });
      }
      console.error('Failed in POST /api/player/unlock-card:', error);
      return res.status(500).json({
        error: error?.message || 'Falha ao desbloquear carta.',
      });
    }
  });

  app.post('/api/player/unlock-avatar', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }
      const { avatarId, currency, equip } = req.body || {};
      if (!avatarId || typeof avatarId !== 'string') {
        return res.status(400).json({ error: 'Avatar inválido.' });
      }
      const normalizedCurrency: CurrencyType = currency === 'gold' ? 'gold' : 'crystals';
      const result = await unlockAvatarByUid(
        req.user.uid,
        avatarId,
        normalizedCurrency,
        req.user.email,
        equip !== false
      );
      return res.json({
        player: result.state,
        unlockedAvatarId: result.unlockedAvatarId,
        costPaid: result.costPaid,
        currency: result.currency,
      });
    } catch (error: any) {
      if (error?.message === 'AVATAR_NOT_FOUND') {
        return res.status(404).json({ error: 'Avatar não encontrado no catálogo.' });
      }
      if (error?.message === 'INSUFFICIENT_CRYSTALS') {
        return res.status(400).json({
          error: 'Cristais insuficientes para adquirir este avatar.',
        });
      }
      if (error?.message === 'INSUFFICIENT_GOLD') {
        return res.status(400).json({
          error: 'Ouro insuficiente para adquirir este avatar.',
        });
      }
      console.error('Failed in POST /api/player/unlock-avatar:', error);
      return res.status(500).json({
        error: error?.message || 'Falha ao desbloquear avatar.',
      });
    }
  });

  app.post('/api/player/unlock-playmat', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }
      const { playmatId, currency, equip } = req.body || {};
      if (!playmatId || typeof playmatId !== 'string') {
        return res.status(400).json({ error: 'Tapete de batalha inválido.' });
      }
      const normalizedCurrency: CurrencyType = currency === 'gold' ? 'gold' : 'crystals';
      const result = await unlockPlaymatByUid(
        req.user.uid,
        playmatId,
        normalizedCurrency,
        req.user.email,
        equip !== false
      );
      return res.json({
        player: result.state,
        unlockedPlaymatId: result.unlockedPlaymatId,
        costPaid: result.costPaid,
        currency: result.currency,
      });
    } catch (error: any) {
      if (error?.message === 'PLAYMAT_NOT_FOUND') {
        return res.status(404).json({ error: 'Tapete de batalha não encontrado no catálogo.' });
      }
      if (error?.message === 'INSUFFICIENT_CRYSTALS') {
        return res.status(400).json({
          error: 'Cristais insuficientes para adquirir este tapete (custa 550 Cristais).',
        });
      }
      if (error?.message === 'INSUFFICIENT_GOLD') {
        return res.status(400).json({
          error: 'Ouro insuficiente para adquirir este tapete (custa 220 Ouro).',
        });
      }
      console.error('Failed in POST /api/player/unlock-playmat:', error);
      return res.status(500).json({
        error: error?.message || 'Falha ao desbloquear tapete de batalha.',
      });
    }
  });

  app.post('/api/player/unlock-card-back', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }
      const { cardBackId, currency, equip } = req.body || {};
      if (!cardBackId || typeof cardBackId !== 'string') {
        return res.status(400).json({ error: 'Verso de carta inválido.' });
      }
      const normalizedCurrency: CurrencyType = currency === 'gold' ? 'gold' : 'crystals';
      const result = await unlockCardBackByUid(
        req.user.uid,
        cardBackId,
        normalizedCurrency,
        req.user.email,
        equip !== false
      );
      return res.json({
        player: result.state,
        unlockedCardBackId: result.unlockedCardBackId,
        costPaid: result.costPaid,
        currency: result.currency,
      });
    } catch (error: any) {
      if (error?.message === 'CARD_BACK_NOT_FOUND') {
        return res.status(404).json({ error: 'Verso de carta não encontrado no catálogo.' });
      }
      if (error?.message === 'INSUFFICIENT_CRYSTALS') {
        return res.status(400).json({
          error: 'Cristais insuficientes para adquirir este verso de carta (custa 300 Cristais).',
        });
      }
      if (error?.message === 'INSUFFICIENT_GOLD') {
        return res.status(400).json({
          error: 'Ouro insuficiente para adquirir este verso de carta (custa 120 Ouro).',
        });
      }
      console.error('Failed in POST /api/player/unlock-card-back:', error);
      return res.status(500).json({
        error: error?.message || 'Falha ao desbloquear verso de carta.',
      });
    }
  });

  app.post('/api/player/open-pack', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }
      const { packType, useFreeCommonPack } = req.body || {};
      if (typeof packType !== 'string' || !(packType in PACK_MAP)) {
        return res.status(400).json({ error: 'Tipo de pacote inválido.' });
      }
      const result = await openCardPackByUid(
        req.user.uid,
        packType as PackType,
        { useFreeCommonPack: Boolean(useFreeCommonPack) },
        req.user.email
      );
      return res.json({
        player: result.state,
        packType: result.packType,
        costPaid: result.costPaid,
        usedFreePack: result.usedFreePack,
        drops: result.drops,
        totalRefundCrystals: result.totalRefundCrystals,
      });
    } catch (error: any) {
      if (error?.message === 'INSUFFICIENT_GOLD') {
        return res.status(400).json({
          error: 'Ouro insuficiente para comprar este pacote de cartas.',
        });
      }
      if (error?.message === 'NO_FREE_PACKS_AVAILABLE') {
        return res.status(400).json({
          error: 'Nenhum Pacote Comum gratuito disponível no momento.',
        });
      }
      console.error('Failed in POST /api/player/open-pack:', error);
      return res.status(500).json({
        error: error?.message || 'Falha ao abrir pacote de cartas.',
      });
    }
  });

  app.post('/api/player/match-complete', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }
      const {
        result,
        deckName,
        opponentName,
        opponentRank,
        mode,
        playerHp,
        playerMaxHp,
        opponentHp,
        totalRounds,
        endReason,
      } = req.body || {};
      const matchOutcome = result === 'victory' ? 'victory' : 'defeat';
      const normalizedMode: 'pvp_normal' | 'pvp_ranked' | 'pvia' =
        mode === 'pvp_normal' || mode === 'pvp_ranked' || mode === 'pvia'
          ? mode
          : 'pvia';

      const outcome = await recordCompletedMatchByUid(
        req.user.uid,
        {
          result: matchOutcome,
          deckName:
            typeof deckName === 'string' && deckName.trim()
              ? deckName.trim().slice(0, 80)
              : 'Tríade Elemental: Fogo, Raiz & Trovão',
          opponentName:
            typeof opponentName === 'string' && opponentName.trim()
              ? opponentName.trim().slice(0, 64)
              : 'Guardião de Celentia',
          opponentRank:
            typeof opponentRank === 'string' && opponentRank.trim()
              ? opponentRank.trim().slice(0, 40)
              : normalizedMode === 'pvia'
              ? 'IA Tática'
              : 'Sem rank',
          mode: normalizedMode,
          playerHp: typeof playerHp === 'number' && Number.isFinite(playerHp) ? playerHp : null,
          playerMaxHp:
            typeof playerMaxHp === 'number' && Number.isFinite(playerMaxHp) ? playerMaxHp : null,
          opponentHp:
            typeof opponentHp === 'number' && Number.isFinite(opponentHp) ? opponentHp : null,
          totalRounds:
            typeof totalRounds === 'number' && Number.isFinite(totalRounds) ? totalRounds : null,
          endReason:
            typeof endReason === 'string' && endReason.trim()
              ? endReason.trim().slice(0, 140)
              : null,
        },
        req.user.email
      );

      return res.json({
        player: outcome.state,
        rewards: outcome.rewards,
      });
    } catch (error: any) {
      console.error('Failed in POST /api/player/match-complete:', error);
      return res.status(500).json({
        error: error?.message || 'Falha ao registrar resultado da partida.',
      });
    }
  });

  app.post('/api/player/claim-tutorial-reward', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }
      const outcome = await claimTutorialRewardByUid(req.user.uid, req.user.email);
      return res.json({
        player: outcome.state,
        claimedNow: outcome.claimedNow,
        goldAwarded: outcome.goldAwarded,
        freeCommonPacksAwarded: outcome.freeCommonPacksAwarded,
      });
    } catch (error: any) {
      if (error?.message === 'PLAYER_NOT_FOUND') {
        return res.status(404).json({ error: 'Conta do jogador não encontrada.' });
      }
      console.error('Failed in POST /api/player/claim-tutorial-reward:', error);
      return res.status(500).json({
        error: error?.message || 'Falha ao resgatar recompensa do tutorial.',
      });
    }
  });

  app.post('/api/player/admin-action', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }
      const { action } = req.body || {};
      if (
        action !== 'unlock_all_cards' &&
        action !== 'grant_event_classes' &&
        action !== 'reset_starter_cards' &&
        action !== 'add_gold_5000' &&
        action !== 'add_crystals_5000' &&
        action !== 'unlock_all_cosmetics' &&
        action !== 'max_level_rank'
      ) {
        return res.status(400).json({ error: 'Ação administrativa inválida.' });
      }
      const player = await executeAdminActionByUid(req.user.uid, action, req.user.email);
      return res.json({ player });
    } catch (error: any) {
      if (error?.message === 'FORBIDDEN_NOT_ADMIN') {
        return res.status(403).json({
          error: 'Permissão negada: apenas contas Admin podem executar esta ação.',
        });
      }
      console.error('Failed in POST /api/player/admin-action:', error);
      return res.status(500).json({
        error: error?.message || 'Falha ao executar ação administrativa.',
      });
    }
  });

  // ============================================================================
  // 2B. PUBLIC PLAYER SEARCH & PROFILE INSPECTION (NO PII / EMAIL EXPOSED)
  // ============================================================================

  app.get('/api/players/search', requireAuth, async (req: AuthRequest, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : '';
      const players = await searchPublicPlayers(q, 20);
      return res.json({ players });
    } catch (error: any) {
      console.error('Failed in GET /api/players/search:', error);
      return res.status(500).json({
        error: error?.message || 'Falha ao pesquisar jogadores.',
      });
    }
  });

  app.get('/api/players/leaderboard', requireAuth, async (req: AuthRequest, res) => {
    try {
      const rawLimit = Number(req.query.limit);
      const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, Math.floor(rawLimit))) : 50;
      const leaderboard = await getGlobalLeaderboard(limit);
      return res.json({ leaderboard });
    } catch (error: any) {
      console.error('Failed in GET /api/players/leaderboard:', error);
      return res.status(500).json({
        error: error?.message || 'Falha ao carregar o ranking geral de jogadores.',
      });
    }
  });

  app.get('/api/players/profile/:identifier', requireAuth, async (req: AuthRequest, res) => {
    try {
      const identifier = String(req.params.identifier || '').trim();
      if (!identifier) {
        return res.status(400).json({ error: 'Informe um @nick válido.' });
      }
      const profile = await getPublicPlayerProfileByIdentifier(identifier);
      if (!profile) {
        return res.status(404).json({ error: 'Jogador não encontrado.' });
      }
      return res.json({ profile });
    } catch (error: any) {
      console.error('Failed in GET /api/players/profile/:identifier:', error);
      return res.status(500).json({
        error: error?.message || 'Falha ao carregar perfil do jogador.',
      });
    }
  });

  // ============================================================================
  // 2C. GAME MODE QUEUE AVAILABILITY CONFIG & ADMIN MANAGEMENT ROUTES
  // ============================================================================

  app.get('/api/config/queues', (_req, res) => {
    return res.json({ queues: modeQueuesState, updatedAtMs: modeQueuesUpdatedAtMs });
  });

  app.put('/api/admin/queues', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }
      const caller = await getPlayerStateByUidOrEmail(
        req.user.uid,
        req.user.email,
        req.user.nickname
      ).catch(() => null);

      const allowed =
        isUserAdminAccount(req.user.email, req.user.nickname) ||
        Boolean(caller?.isAdmin);
      if (!allowed) {
        return res.status(403).json({
          error: 'Permissão negada: apenas administradores podem alterar filas de modos.',
        });
      }

      const incomingQueues = req.body?.queues;
      if (!incomingQueues || typeof incomingQueues !== 'object') {
        return res.status(400).json({ error: 'Configuração de filas inválida.' });
      }

      const nextState: Record<QueueId, { enabled: boolean; reason: string }> = {
        ...modeQueuesState,
      };
      for (const id of QUEUE_IDS) {
        const entry = incomingQueues[id];
        if (entry && typeof entry === 'object') {
          nextState[id] = {
            enabled: typeof entry.enabled === 'boolean' ? entry.enabled : true,
            reason:
              typeof entry.reason === 'string'
                ? entry.reason.trim().slice(0, 140)
                : '',
          };
        }
      }

      modeQueuesState = nextState;
      modeQueuesUpdatedAtMs = Date.now();
      persistModeQueuesToDisk();
      return res.json({ queues: modeQueuesState, updatedAtMs: modeQueuesUpdatedAtMs });
    } catch (error: any) {
      console.error('Failed in PUT /api/admin/queues:', error);
      return res.status(500).json({
        error: error?.message || 'Falha ao atualizar status das filas.',
      });
    }
  });

  // Global Rank Lock Policy Endpoints
  app.get('/api/config/rank-policy', (_req, res) => {
    return res.json({ policy: rankPolicyState, updatedAtMs: rankPolicyUpdatedAtMs });
  });

  app.put('/api/admin/rank-policy', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }
      const caller = await getPlayerStateByUidOrEmail(
        req.user.uid,
        req.user.email,
        req.user.nickname
      ).catch(() => null);

      const allowed =
        isUserAdminAccount(req.user.email, req.user.nickname) ||
        Boolean(caller?.isAdmin);
      if (!allowed) {
        return res.status(403).json({
          error: 'Permissão negada: apenas administradores podem bloquear ou liberar ranks.',
        });
      }

      const rawTier = req.body?.blockedFromTier;
      const normalized =
        rawTier === null || rawTier === undefined || rawTier === 'none' || rawTier === ''
          ? null
          : normalizeRankTierInput(rawTier);

      if (rawTier !== null && rawTier !== undefined && rawTier !== 'none' && rawTier !== '' && !normalized) {
        return res.status(400).json({ error: 'Elo de bloqueio inválido.' });
      }

      rankPolicyState = { blockedFromTier: normalized };
      rankPolicyUpdatedAtMs = Date.now();
      persistRankPolicyToDisk();
      return res.json({ policy: rankPolicyState, updatedAtMs: rankPolicyUpdatedAtMs });
    } catch (error: any) {
      console.error('Failed in PUT /api/admin/rank-policy:', error);
      return res.status(500).json({
        error: error?.message || 'Falha ao atualizar política global de rank.',
      });
    }
  });

  app.get('/api/admin/users', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }
      const q = typeof req.query.q === 'string' ? req.query.q : '';
      const usersList = await adminListUsers(req.user.uid, req.user.email, q);
      return res.json({ users: usersList });
    } catch (error: any) {
      if (error?.message === 'FORBIDDEN_NOT_ADMIN') {
        return res.status(403).json({
          error: 'Permissão negada: acesso exclusivo para administradores.',
        });
      }
      console.error('Failed in GET /api/admin/users:', error);
      return res.status(500).json({
        error: error?.message || 'Falha ao listar usuários.',
      });
    }
  });

  app.put('/api/admin/users/:targetUid', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }
      const targetUid = String(req.params.targetUid || '').trim();
      if (!targetUid) {
        return res.status(400).json({ error: 'Usuário alvo inválido.' });
      }
      const {
        nickname,
        gold,
        crystals,
        level,
        xp,
        rankPoints,
        preferredSide,
        rankBlockedTotal,
        rankBlockFromTier,
      } = req.body || {};
      const result = await adminUpdateUserProfile(
        req.user.uid,
        req.user.email,
        targetUid,
        {
          nickname,
          gold,
          crystals,
          level,
          xp,
          rankPoints,
          preferredSide,
          rankBlockedTotal,
          rankBlockFromTier,
        }
      );
      return res.json(result);
    } catch (error: any) {
      if (error?.message === 'FORBIDDEN_NOT_ADMIN') {
        return res.status(403).json({
          error: 'Permissão negada: apenas administradores podem editar outros perfis.',
        });
      }
      if (error?.message === 'TARGET_USER_NOT_FOUND') {
        return res.status(404).json({ error: 'Perfil do usuário não encontrado.' });
      }
      if (error?.message === 'NICKNAME_ALREADY_EXISTS') {
        return res.status(409).json({
          error: 'Este @nick já está sendo usado por outro jogador.',
        });
      }
      if (typeof error?.message === 'string' && error.message.startsWith('INVALID_NICKNAME:')) {
        return res.status(400).json({
          error: error.message.slice('INVALID_NICKNAME:'.length),
        });
      }
      console.error('Failed in PUT /api/admin/users/:targetUid:', error);
      return res.status(500).json({
        error: error?.message || 'Falha ao atualizar perfil do usuário.',
      });
    }
  });

  app.post('/api/admin/users/:targetUid/deliver-card', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }
      const targetUid = String(req.params.targetUid || '').trim();
      const { cardId } = req.body || {};
      if (!targetUid || !cardId || typeof cardId !== 'string') {
        return res.status(400).json({ error: 'Jogador ou carta inválidos.' });
      }
      const result = await adminDeliverCardToUser(
        req.user.uid,
        req.user.email,
        targetUid,
        cardId
      );
      return res.json(result);
    } catch (error: any) {
      if (error?.message === 'FORBIDDEN_NOT_ADMIN') {
        return res.status(403).json({ error: 'Apenas administradores podem entregar cartas.' });
      }
      if (error?.message === 'TARGET_USER_NOT_FOUND') {
        return res.status(404).json({ error: 'Jogador alvo não encontrado.' });
      }
      if (error?.message === 'CARD_NOT_FOUND') {
        return res.status(404).json({ error: 'Carta não encontrada.' });
      }
      console.error('Failed in POST /api/admin/users/:targetUid/deliver-card:', error);
      return res.status(500).json({
        error: error?.message || 'Falha ao entregar carta.',
      });
    }
  });

  app.post('/api/admin/users/:targetUid/deliver-avatar', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }
      const targetUid = String(req.params.targetUid || '').trim();
      const { avatarId } = req.body || {};
      if (!targetUid || !avatarId || typeof avatarId !== 'string') {
        return res.status(400).json({ error: 'Jogador ou avatar inválidos.' });
      }
      const result = await adminDeliverAvatarToUser(
        req.user.uid,
        req.user.email,
        targetUid,
        avatarId
      );
      return res.json(result);
    } catch (error: any) {
      if (error?.message === 'FORBIDDEN_NOT_ADMIN') {
        return res.status(403).json({ error: 'Apenas administradores podem liberar avatares.' });
      }
      if (error?.message === 'TARGET_USER_NOT_FOUND') {
        return res.status(404).json({ error: 'Jogador alvo não encontrado.' });
      }
      if (error?.message === 'AVATAR_NOT_FOUND') {
        return res.status(404).json({ error: 'Avatar não encontrado.' });
      }
      console.error('Failed in POST /api/admin/users/:targetUid/deliver-avatar:', error);
      return res.status(500).json({
        error: error?.message || 'Falha ao liberar avatar.',
      });
    }
  });

  app.post('/api/admin/users/:targetUid/grant-resources', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }
      const targetUid = String(req.params.targetUid || '').trim();
      const { addXp, addRankPoints, addGold, addCrystals } = req.body || {};
      if (!targetUid) {
        return res.status(400).json({ error: 'Jogador alvo inválido.' });
      }
      const result = await adminGrantResourcesToUser(
        req.user.uid,
        req.user.email,
        targetUid,
        { addXp, addRankPoints, addGold, addCrystals }
      );
      return res.json(result);
    } catch (error: any) {
      if (error?.message === 'FORBIDDEN_NOT_ADMIN') {
        return res.status(403).json({ error: 'Apenas administradores podem entregar recursos.' });
      }
      if (error?.message === 'TARGET_USER_NOT_FOUND') {
        return res.status(404).json({ error: 'Jogador alvo não encontrado.' });
      }
      console.error('Failed in POST /api/admin/users/:targetUid/grant-resources:', error);
      return res.status(500).json({
        error: error?.message || 'Falha ao entregar recursos.',
      });
    }
  });

  app.post('/api/admin/users/:targetUid/action', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }
      const targetUid = String(req.params.targetUid || '').trim();
      const { action } = req.body || {};
      if (
        action !== 'unlock_all_cards' &&
        action !== 'grant_event_classes' &&
        action !== 'reset_starter_cards' &&
        action !== 'add_gold_5000' &&
        action !== 'add_crystals_5000' &&
        action !== 'unlock_all_cosmetics' &&
        action !== 'max_level_rank'
      ) {
        return res.status(400).json({ error: 'Ação administrativa inválida.' });
      }
      const result = await adminExecuteActionOnTargetUser(
        req.user.uid,
        req.user.email,
        targetUid,
        action
      );
      return res.json(result);
    } catch (error: any) {
      if (error?.message === 'FORBIDDEN_NOT_ADMIN') {
        return res.status(403).json({
          error: 'Permissão negada: apenas administradores podem executar comandos em contas.',
        });
      }
      if (error?.message === 'TARGET_USER_NOT_FOUND') {
        return res.status(404).json({ error: 'Usuário alvo não encontrado.' });
      }
      console.error('Failed in POST /api/admin/users/:targetUid/action:', error);
      return res.status(500).json({
        error: error?.message || 'Falha ao executar comando administrativo.',
      });
    }
  });

  app.all('/api/*', (_req, res) => {
    return res.status(404).json({ error: 'Endpoint de API não encontrado.' });
  });

  const httpServer = http.createServer(app);

  // ============================================================================
  // 3. VITE MIDDLEWARE (DEV) OR STATIC ASSETS (PROD)
  // ============================================================================
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ...(disableHmr
          ? { hmr: false, ws: false }
          : {
              ws: {
                server: httpServer,
                path: '/vite-hmr',
              },
            }),
      },
      appType: 'spa',
    });

    if (disableHmr) {
      const disabledHmrClientStub = `
const sheetsMap = new Map();
const linkSheetsMap = new Map();
if ("document" in globalThis) {
  document.querySelectorAll("style[data-vite-dev-id]").forEach((el) => {
    sheetsMap.set(el.getAttribute("data-vite-dev-id"), el);
  });
  document.querySelectorAll('link[rel="stylesheet"][data-vite-dev-id]').forEach((el) => {
    linkSheetsMap.set(el.getAttribute("data-vite-dev-id"), el);
  });
}
let lastInsertedStyle;
export function updateStyle(id, content) {
  if (linkSheetsMap.has(id)) return;
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.setAttribute("data-vite-dev-id", id);
    style.textContent = content;
    if (!lastInsertedStyle) {
      document.head.appendChild(style);
      setTimeout(() => { lastInsertedStyle = undefined; }, 0);
    } else {
      lastInsertedStyle.insertAdjacentElement("afterend", style);
    }
    lastInsertedStyle = style;
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  if (linkSheetsMap.has(id)) {
    document.querySelectorAll(\`link[rel="stylesheet"][data-vite-dev-id="\${CSS.escape(id)}"]\`).forEach((el) => el.remove());
    linkSheetsMap.delete(id);
  }
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url, queryToInject) {
  if (url[0] !== "." && url[0] !== "/") return url;
  const pathname = url.replace(/[?#].*$/, "");
  const { search, hash } = new URL(url, "http://vite.dev");
  return \`\${pathname}?\${queryToInject}\${search ? "&" + search.slice(1) : ""}\${hash || ""}\`;
}
export class ErrorOverlay extends HTMLElement {}
`;
      app.get('/@vite/client', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(disabledHmrClientStub);
      });
    }

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  setupPvpWebSocketServer(httpServer, {
    isQueueEnabled: (matchType) => {
      const key: QueueId = matchType === 'ranked' ? 'pvp_ranked' : 'pvp_normal';
      return modeQueuesState[key];
    },
    getRankPolicy: () => rankPolicyState,
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT} (HTTP + WS /ws/pvp)`);
  });
}

startServer();
