/**
 * Next.js instrumentation — opcional: retenção da auditoria ao subir o processo.
 * Ative só com `RETENCAO_AUDITORIA_ON_STARTUP=true` (não recomendado em dev frequente).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.RETENCAO_AUDITORIA_ON_STARTUP !== "true") return;

  try {
    const { executarRetencaoAuditoriaFinanceira } = await import(
      "@/lib/auditoria-retencao"
    );
    const r = await executarRetencaoAuditoriaFinanceira();
    console.info("[instrumentation] Retenção auditoria OK:", r);
  } catch (e) {
    console.error(
      "[instrumentation] Retenção auditoria falhou (dados não apagados se rollback SQL).",
      e
    );
  }
}
