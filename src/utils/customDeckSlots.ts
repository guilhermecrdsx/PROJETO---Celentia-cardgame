import { PRESET_FIRE_LIGHTNING } from '../logic/deckFactory';
import {
  getInMemoryPlayerState,
  syncDeckSlotToCloud,
} from '../services/accountApi';

export interface CustomDeckSlot {
  slotId: number; // 1, 2, 3
  name: string;
  cardIds: string[];
  updatedAt: number;
}

const STORAGE_KEY_SLOTS = 'celentia_custom_deck_slots_v3';
const STORAGE_KEY_ACTIVE_SLOT = 'celentia_active_deck_slot_v3';

export const DEFAULT_CUSTOM_SLOTS: CustomDeckSlot[] = [
  {
    slotId: 1,
    name: PRESET_FIRE_LIGHTNING.name,
    cardIds: [...PRESET_FIRE_LIGHTNING.cardIds],
    updatedAt: Date.now(),
  },
  {
    slotId: 2,
    name: PRESET_FIRE_LIGHTNING.name,
    cardIds: [...PRESET_FIRE_LIGHTNING.cardIds],
    updatedAt: Date.now(),
  },
  {
    slotId: 3,
    name: PRESET_FIRE_LIGHTNING.name,
    cardIds: [...PRESET_FIRE_LIGHTNING.cardIds],
    updatedAt: Date.now(),
  },
];

export function getCustomDeckSlots(): CustomDeckSlot[] {
  const cloudState = getInMemoryPlayerState();
  if (cloudState && Array.isArray(cloudState.decks) && cloudState.decks.length === 3) {
    return cloudState.decks.map((d) => ({
      slotId: d.slotId,
      name: d.name,
      cardIds: [...d.cardIds],
      updatedAt: d.updatedAt,
    }));
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_SLOTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 3) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Erro ao carregar slots de baralho:', e);
  }
  return DEFAULT_CUSTOM_SLOTS;
}

export function saveCustomDeckSlot(
  slotId: number,
  name: string,
  cardIds: string[],
  setActive: boolean = false
): CustomDeckSlot[] {
  const cleanName = name.trim() || `Baralho Personalizado ${slotId}`;
  const current = getCustomDeckSlots();
  const updated = current.map((slot) => {
    if (slot.slotId === slotId) {
      return {
        ...slot,
        name: cleanName,
        cardIds: [...cardIds],
        updatedAt: Date.now(),
      };
    }
    return slot;
  });

  void syncDeckSlotToCloud({
    slotId,
    name: cleanName,
    cardIds: [...cardIds],
    setActive,
  });

  try {
    localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(updated));
    localStorage.setItem('reinos_em_guerra_custom_deck', JSON.stringify(cardIds));
  } catch (e) {
    console.warn('Erro ao salvar slot de baralho:', e);
  }

  return updated;
}

export function resetCustomDeckSlot(slotId: number): CustomDeckSlot[] {
  const current = getCustomDeckSlots();
  const fallback =
    DEFAULT_CUSTOM_SLOTS.find((s) => s.slotId === slotId) || DEFAULT_CUSTOM_SLOTS[0];
  const resetName = fallback.name;
  const resetCards = [...fallback.cardIds];

  const updated = current.map((slot) => {
    if (slot.slotId === slotId) {
      return {
        ...slot,
        name: resetName,
        cardIds: resetCards,
        updatedAt: Date.now(),
      };
    }
    return slot;
  });

  void syncDeckSlotToCloud({
    slotId,
    name: resetName,
    cardIds: resetCards,
  });

  try {
    localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(updated));
  } catch (e) {
    console.warn('Erro ao resetar slot:', e);
  }

  return updated;
}

export function getActiveSlotId(): number {
  const cloudState = getInMemoryPlayerState();
  if (cloudState && cloudState.activeSlotId >= 1 && cloudState.activeSlotId <= 3) {
    return cloudState.activeSlotId;
  }

  try {
    const val = localStorage.getItem(STORAGE_KEY_ACTIVE_SLOT);
    if (val) {
      const parsed = parseInt(val, 10);
      if (parsed >= 1 && parsed <= 3) return parsed;
    }
  } catch {
    // ignore
  }
  return 1;
}

export function setActiveSlotId(slotId: number): void {
  const slots = getCustomDeckSlots();
  const targetSlot = slots.find((s) => s.slotId === slotId);
  if (targetSlot) {
    void syncDeckSlotToCloud({
      slotId: targetSlot.slotId,
      name: targetSlot.name,
      cardIds: targetSlot.cardIds,
      setActive: true,
    });
  }

  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_SLOT, String(slotId));
  } catch {
    // ignore
  }
}
