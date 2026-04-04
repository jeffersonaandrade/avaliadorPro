const STORAGE_KEY = "avaliadorPro_client_id";

function novoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Identificador anônimo persistente para cota de FIPE no servidor (localStorage). */
export function obterIdentificadorClienteNavegador(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id?.trim()) {
      id = novoId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id.trim();
  } catch {
    return "";
  }
}
