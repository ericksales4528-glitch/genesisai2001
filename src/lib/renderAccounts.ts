export interface RenderAccount {
  id: string;
  name: string;
  apiKey: string;
  ownerId: string;
}

const STORAGE_KEY = "genesis_render_accounts";
const SELECTED_KEY = "genesis_selected_render_account";

export function getRenderAccounts(): RenderAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRenderAccounts(accounts: RenderAccount[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function addRenderAccount(account: Omit<RenderAccount, "id">): RenderAccount {
  const accounts = getRenderAccounts();
  const newAccount: RenderAccount = {
    ...account,
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };
  saveRenderAccounts([...accounts, newAccount]);
  return newAccount;
}

export function removeRenderAccount(id: string): void {
  const accounts = getRenderAccounts().filter((a) => a.id !== id);
  saveRenderAccounts(accounts);
  const selected = getSelectedRenderAccountId();
  if (selected === id) {
    localStorage.removeItem(SELECTED_KEY);
  }
}

export function getSelectedRenderAccountId(): string | null {
  try {
    return localStorage.getItem(SELECTED_KEY);
  } catch {
    return null;
  }
}

export function setSelectedRenderAccountId(id: string | null): void {
  if (id) localStorage.setItem(SELECTED_KEY, id);
  else localStorage.removeItem(SELECTED_KEY);
}

export function getSelectedRenderAccount(): RenderAccount | null {
  const id = getSelectedRenderAccountId();
  if (!id) return null;
  return getRenderAccounts().find((a) => a.id === id) || null;
}
