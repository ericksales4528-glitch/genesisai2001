import { useState, useEffect } from "react";
import {
  RenderAccount,
  getRenderAccounts,
  addRenderAccount,
  removeRenderAccount,
  getSelectedRenderAccountId,
  setSelectedRenderAccountId,
} from "@/lib/renderAccounts";
import { toast } from "sonner";

export default function RenderAccountSelector({
  onAccountChange,
}: {
  onAccountChange?: (account: RenderAccount | null) => void;
}) {
  const [accounts, setAccounts] = useState<RenderAccount[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [ownerId, setOwnerId] = useState("");

  useEffect(() => {
    const list = getRenderAccounts();
    setAccounts(list);
    const sel = getSelectedRenderAccountId();
    setSelectedId(sel);
  }, []);

  const refresh = () => {
    const list = getRenderAccounts();
    setAccounts(list);
  };

  const handleSelect = (id: string) => {
    setSelectedRenderAccountId(id);
    setSelectedId(id);
    const acc = accounts.find((a) => a.id === id) || null;
    onAccountChange?.(acc);
  };

  const handleAdd = () => {
    const trimmedName = name.trim();
    const trimmedKey = apiKey.trim();
    const trimmedOwner = ownerId.trim();
    if (!trimmedName || !trimmedKey || !trimmedOwner) {
      toast.error("Preencha todos os campos");
      return;
    }
    const newAcc = addRenderAccount({
      name: trimmedName,
      apiKey: trimmedKey,
      ownerId: trimmedOwner,
    });
    refresh();
    handleSelect(newAcc.id);
    setShowForm(false);
    setName("");
    setApiKey("");
    setOwnerId("");
    toast.success("Conta Render adicionada");
  };

  const handleDelete = (id: string) => {
    removeRenderAccount(id);
    refresh();
    if (selectedId === id) {
      setSelectedId(null);
      onAccountChange?.(null);
    }
    toast.success("Conta removida");
  };

  return (
    <div className="space-y-2">
      <label className="nexus-label">Conta Render</label>

      {accounts.length > 0 && (
        <select
          className="nexus-select"
          value={selectedId || ""}
          onChange={(e) => handleSelect(e.target.value)}
        >
          <option value="">Selecione uma conta...</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name}
            </option>
          ))}
        </select>
      )}

      {accounts.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhuma conta configurada.</p>
      )}

      {accounts.map((acc) =>
        selectedId === acc.id ? (
          <div key={acc.id} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
            <span className="text-sm text-foreground">{acc.name}</span>
            <button
              type="button"
              onClick={() => handleDelete(acc.id)}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Remover
            </button>
          </div>
        ) : null
      )}

      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="text-xs font-semibold text-primary hover:text-primary/80"
        >
          + Adicionar conta Render
        </button>
      )}

      {showForm && (
        <div className="space-y-2 rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-semibold text-muted-foreground">Nova conta Render</p>
          <input
            className="nexus-input text-sm"
            placeholder="Nome (ex: Conta principal)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="nexus-input text-sm"
            placeholder="Render API Key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <input
            className="nexus-input text-sm"
            placeholder="Render Owner ID"
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              className="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
