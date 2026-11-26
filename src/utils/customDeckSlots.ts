import {
  clearActiveCustomDeckInCloud,
  getInMemoryPlayerState,
  syncDeckSlotToCloud,
} from '../services/accountApi';

export interface CustomDeckSlot {
  slotId: number; // 1, 2, 3
  name: string;
  cardIds: string[];
  updatedAt: number;
}

const LEGACY_STORAGE_KEYS = [
  'celentia_custom_deck_slots_v3',
  'celentia_active_deck_slot_v3',
  'reinos_em_guerra_custom_deck',
];

export function clearLegacyDeckStorage(): void {
  try {
    for (const key of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore storage errors
  }
}

export function createEmptyCustomSlots(): CustomDeckSlot[] {
  return [
    { slotId: 1, name: 'Espaço Vazio 1', cardIds: [], updatedAt: 0 },
    { slotId: 2, name: 'Espaço Vazio 2', cardIds: [], updatedAt: 0 },
    { slotId: 3, name: 'Espaço Vazio 3', cardIds: [], updatedAt: 0 },
  ];
}

export const DEFAULT_CUSTOM_SLOTS: CustomDeckSlot[] = createEmptyCustomSlots();

export function isCustomDeckSlotFilled(slot: Pick<CustomDeckSlot, 'cardIds'>): boolean {
  return Array.isArray(slot.cardIds) && slot.cardIds.length === 20;
}

/**
 * Decks are strictly bound to the authenticated cloud account.
 * Never read from unscoped browser localStorage to guarantee zero cross-account leaks.
 */
export function getCustomDeckSlots(): CustomDeckSlot[] {
  const cloudState = getInMemoryPlayerState();
  if (cloudState && Array.isArray(cloudState.decks) && cloudState.decks.length === 3) {
    return [1, 2, 3].map((slotId) => {
      const found = cloudState.decks.find((d) => d.slotId === slotId);
      const validCards =
        found && Array.isArray(found.cardIds) && found.cardIds.length === 20
          ? [...found.cardIds]
          : [];
      return {
        slotId,
        name:
          validCards.length === 20 && found?.name?.trim()
            ? found.name.trim()
            : `Espaço Vazio ${slotId}`,
        cardIds: validCards,
        updatedAt: validCards.length === 20 ? found?.updatedAt || 0 : 0,
      };
    });
  }

  return createEmptyCustomSlots();
}

export function saveCustomDeckSlot(
  slotId: number,
  name: string,
  cardIds: string[],
  setActive: boolean = false
): CustomDeckSlot[] {
  const isClearing = cardIds.length === 0;
  const cleanName = isClearing
    ? `Espaço Vazio ${slotId}`
    : name.trim() || `Baralho Personalizado ${slotId}`;
  const current = getCustomDeckSlots();
  const updated = current.map((slot) => {
    if (slot.slotId === slotId) {
      return {
        ...slot,
        name: cleanName,
        cardIds: isClearing ? [] : [...cardIds],
        updatedAt: isClearing ? 0 : Date.now(),
      };
    }
    return slot;
  });

  clearLegacyDeckStorage();

  void syncDeckSlotToCloud({
    slotId,
    name: cleanName,
    cardIds: isClearing ? [] : [...cardIds],
    setActive: !isClearing && setActive,
  });

  return updated;
}

export function resetCustomDeckSlot(slotId: number): CustomDeckSlot[] {
  const resetName = `Espaço Vazio ${slotId}`;
  const current = getCustomDeckSlots();

  const updated = current.map((slot) => {
    if (slot.slotId === slotId) {
      return {
        ...slot,
        name: resetName,
        cardIds: [],
        updatedAt: 0,
      };
    }
    return slot;
  });

  clearLegacyDeckStorage();

  void syncDeckSlotToCloud({
    slotId,
    name: resetName,
    cardIds: [],
    setActive: false,
  });

  return updated;
}

/**
 * Returns 1..3 if the player actively selected a filled custom slot, or 0 if the
 * default starter/preset deck is active.
 */
export function getActiveSlotId(): number {
  const cloudState = getInMemoryPlayerState();
  if (cloudState && cloudState.activeSlotId >= 1 && cloudState.activeSlotId <= 3) {
    const slot = cloudState.decks.find((d) => d.slotId === cloudState.activeSlotId);
    if (slot && Array.isArray(slot.cardIds) && slot.cardIds.length === 20) {
      return cloudState.activeSlotId;
    }
  }
  return 0;
}

export function setActiveSlotId(slotId: number): void {
  if (slotId === 0) {
    void clearActiveCustomDeckInCloud();
    return;
  }

  const slots = getCustomDeckSlots();
  const targetSlot = slots.find((s) => s.slotId === slotId);
  if (targetSlot && isCustomDeckSlotFilled(targetSlot)) {
    void syncDeckSlotToCloud({
      slotId: targetSlot.slotId,
      name: targetSlot.name,
      cardIds: targetSlot.cardIds,
      setActive: true,
    });
  }
}

export function deactivateCustomDeckSlots(): void {
  void clearActiveCustomDeckInCloud();
}
