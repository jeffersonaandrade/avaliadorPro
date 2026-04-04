---
name: avaliador-pro-veiculos
description: Domínio e fluxos do Avaliador PRO (viabilidade veicular, integrações FIPE/leilão/sinistro, créditos Supabase, tRPC). Use ao implementar features de avaliação, integrar fornecedores de dados veiculares, definir débito de créditos ou rever segurança server-only.
---

# Avaliador PRO — skill de domínio

## O que é

Calculadora B2B de **margem real**: consome dados veiculares, aplica custos (reparo, impostos, taxas) e devolve viabilidade. Stack: Next.js App Router, TS strict, Tailwind, tRPC, Supabase.

## Fluxo seguro de integração (checklist)

1. Definir **schema Zod** para o payload externo (leilão, sinistro, FIPE, etc.)
2. Implementar chamada HTTP **só no servidor** (tRPC procedure ou Server Action); ler secrets de `process.env` no servidor
3. Validar resposta com Zod; em falha/timeout/**502** → resposta de erro ao cliente **sem** mutação de saldo/crédito
4. Só após validação bem-sucedida → persistir resultado e/ou **debitar crédito** (transação idempotente se houver risco de retry)
5. Log estruturado: fornecedor, status HTTP, duração, `userId`/tenant se aplicável (sem dados sensíveis desnecessários)

## Créditos (No Data, No Charge)

- Débito **depois** de dados válidos; se a API falhar antes disso, **zero** débito
- Em retries do cliente, preferir **idempotency key** ou verificação de “já processado” para não duplicar cobrança

## UI e testes

- `data-testid` em campos críticos (placa, submit, resultados)
- Loading e erros explícitos para o lojista no telemóvel
- Testes unitários (Vitest) na pasta **`tests/unit/`** na raiz — não junto ao código em `src/`; ver rule `avaliador-pro-stack.mdc`

## SQL Supabase

- Quando precisar de DDL/RPC/policies: produzir **SQL para copiar/colar** no Supabase (não criar ficheiros de migration no repo salvo o utilizador pedir o contrário)

## Referência rápida de camadas

- **UI**: componentes + hooks leves; sem secrets
- **Domínio**: serviços puros de cálculo (testáveis)
- **Borda**: adapters HTTP para cada fornecedor; mapear para tipos internos
