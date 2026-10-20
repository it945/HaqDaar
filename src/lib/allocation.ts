export interface AllocDonor { id: string; available: number }
export interface AllocFamily { id: string; topup: number; approved_at?: string | null }
export interface AllocAssignment { donor_id: string; donee_id: string; share_paisa: number; tax_paisa: number; total_reserved: number }

export interface AllocPlan {
  assignments: AllocAssignment[];
  unfunded: string[];
  nextPointer: string | null;
  unusedPaisa: number;
}

export const slotCost = (topup: number, taxRate: number) => Math.floor(topup * (1 + taxRate));

// Families left out last month come first, then everyone else; oldest approval first within each group.
export function orderFamilies<T extends AllocFamily>(families: T[], lastUnfunded: string[]): T[] {
  const leftOut = new Set(lastUnfunded);
  return [...families].sort((a, b) => {
    const pa = leftOut.has(a.id), pb = leftOut.has(b.id);
    if (pa !== pb) return pa ? -1 : 1;
    return (a.approved_at ?? '').localeCompare(b.approved_at ?? '');
  });
}

// Each family is paid in full by exactly one donor, or not at all this month.
export function planAllocation(input: {
  donors: AllocDonor[];
  families: AllocFamily[];
  lastPairs: { donor_id: string; donee_id: string }[];
  pointerDonorId?: string | null;
  taxRate: number;
}): AllocPlan {
  const { taxRate } = input;
  const sorted = input.donors.filter(d => d.available > 0).sort((a, b) => b.available - a.available);
  const byId = new Map(sorted.map(d => [d.id, d]));
  const used = new Map<string, number>();
  const free = (d: AllocDonor) => d.available - (used.get(d.id) || 0);
  const pending = new Map(input.families.filter(f => f.topup > 0).map(f => [f.id, f]));
  const assignments: AllocAssignment[] = [];

  const assign = (d: AllocDonor, f: AllocFamily) => {
    const cost = slotCost(f.topup, taxRate);
    assignments.push({ donor_id: d.id, donee_id: f.id, share_paisa: f.topup, tax_paisa: cost - f.topup, total_reserved: cost });
    used.set(d.id, (used.get(d.id) || 0) + cost);
    pending.delete(f.id);
  };

  const lastDonors = new Map<string, string[]>();
  for (const p of input.lastPairs) lastDonors.set(p.donee_id, [...(lastDonors.get(p.donee_id) || []), p.donor_id]);

  for (const f of input.families) {
    if (!pending.has(f.id)) continue;
    for (const donorId of lastDonors.get(f.id) || []) {
      const d = byId.get(donorId);
      if (d && free(d) >= slotCost(f.topup, taxRate)) { assign(d, f); break; }
    }
  }

  let ptr = Math.max(0, sorted.findIndex(d => d.id === input.pointerDonorId));
  const unfunded: string[] = [];
  for (const f of input.families) {
    if (!pending.has(f.id)) continue;
    const cost = slotCost(f.topup, taxRate);
    let funded = false;
    for (let k = 0; k < sorted.length; k++) {
      const i = (ptr + k) % sorted.length;
      if (free(sorted[i]) >= cost) {
        assign(sorted[i], f);
        ptr = (i + 1) % sorted.length;
        funded = true;
        break;
      }
    }
    if (!funded) unfunded.push(f.id);
  }

  return {
    assignments,
    unfunded,
    nextPointer: sorted.length > 0 ? sorted[ptr].id : null,
    unusedPaisa: sorted.reduce((s, d) => s + free(d), 0),
  };
}

// A depositor funds left-out families in priority order, each in full, while their free balance covers a slot.
export function planDepositFunding(depositorId: string, freePaisa: number, families: AllocFamily[], taxRate: number) {
  const assignments: AllocAssignment[] = [];
  const stillUnfunded: string[] = [];
  let free = freePaisa;
  for (const f of families) {
    const cost = slotCost(f.topup, taxRate);
    if (f.topup > 0 && free >= cost) {
      assignments.push({ donor_id: depositorId, donee_id: f.id, share_paisa: f.topup, tax_paisa: cost - f.topup, total_reserved: cost });
      free -= cost;
    } else if (f.topup > 0) {
      stillUnfunded.push(f.id);
    }
  }
  return { assignments, stillUnfunded };
}

// Balance not yet committed to this month's families: commitments minus what those families already spent.
export const depositorFreePaisa = (available: number, committedThisMonth: number, spentThisMonth: number) =>
  available - Math.max(0, committedThisMonth - spentThisMonth);

export interface AllocNotes {
  eligible: number;
  funded: number;
  unfunded: { id: string; name: string }[];
  unused_paisa: number;
}

export function parseAllocNotes(notes?: string | null): AllocNotes | null {
  if (!notes || !notes.startsWith('{')) return null;
  try {
    const n = JSON.parse(notes);
    return Array.isArray(n.unfunded) ? n : null;
  } catch {
    return null;
  }
}
