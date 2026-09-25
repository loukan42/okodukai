import { Prisma, WalletTransactionType } from "@prisma/client";
import { prisma } from "./prisma.js";

type Tx = Prisma.TransactionClient;

/** Types dont le montant s'applique au solde disponible (bourse). */
const AVAILABLE_CREDIT: WalletTransactionType[] = ["QUEST_REWARD", "PARENT_BONUS", "REWARD_REFUND", "SAVINGS_UNLOCK"];
const AVAILABLE_DEBIT: WalletTransactionType[] = ["REWARD_PURCHASE", "SAVINGS_LOCK"];

/** Types dont le montant s'applique au coffre (épargne). */
const VAULT_CREDIT: WalletTransactionType[] = ["SAVINGS_LOCK", "SAVINGS_BONUS"];
const VAULT_DEBIT: WalletTransactionType[] = ["SAVINGS_UNLOCK"];

export class InsufficientFundsError extends Error {
  constructor() {
    super("Solde insuffisant");
    this.name = "InsufficientFundsError";
  }
}

export class DuplicateTransactionError extends Error {
  constructor() {
    super("Transaction déjà appliquée (clé d'idempotence réutilisée)");
    this.name = "DuplicateTransactionError";
  }
}

export interface RecordTransactionInput {
  walletId: string;
  amount: number;
  type: WalletTransactionType;
  actorId: string;
  idempotencyKey: string;
  sourceType?: string;
  sourceId?: string;
  reason?: string;
  /**
   * `PARENT_ADJUSTMENT` peut retirer des pièces : préciser explicitement le sens.
   */
  direction?: "credit" | "debit";
}

/**
 * Enregistre une transaction de ledger de façon atomique et idempotente.
 * Doit toujours être appelée à l'intérieur d'un `prisma.$transaction`.
 */
export async function recordWalletTransaction(tx: Tx, input: RecordTransactionInput) {
  if (input.amount <= 0) {
    throw new Error("Le montant d'une transaction doit être positif");
  }

  const existing = await tx.walletTransaction.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) {
    throw new DuplicateTransactionError();
  }

  const isAvailableDebit =
    AVAILABLE_DEBIT.includes(input.type) || (input.type === "PARENT_ADJUSTMENT" && input.direction === "debit");

  if (isAvailableDebit) {
    const balances = await getBalances(tx, input.walletId);
    if (balances.available < input.amount) {
      throw new InsufficientFundsError();
    }
  }

  if (input.type === "SAVINGS_UNLOCK") {
    const balances = await getBalances(tx, input.walletId);
    if (balances.vault < input.amount) {
      throw new InsufficientFundsError();
    }
  }

  return tx.walletTransaction.create({
    data: {
      walletId: input.walletId,
      amount: input.amount,
      type: input.type,
      direction: input.type === "PARENT_ADJUSTMENT" ? (input.direction ?? "credit") : null,
      actorId: input.actorId,
      idempotencyKey: input.idempotencyKey,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      reason: input.reason,
    },
  });
}

export async function getBalances(client: Tx | typeof prisma, walletId: string) {
  const transactions = await client.walletTransaction.findMany({
    where: { walletId },
    select: { amount: true, type: true, direction: true },
  });

  let available = 0;
  let vault = 0;

  for (const txn of transactions) {
    if (AVAILABLE_CREDIT.includes(txn.type)) available += txn.amount;
    if (AVAILABLE_DEBIT.includes(txn.type)) available -= txn.amount;
    if (VAULT_CREDIT.includes(txn.type)) vault += txn.amount;
    if (VAULT_DEBIT.includes(txn.type)) vault -= txn.amount;
    if (txn.type === "PARENT_ADJUSTMENT") {
      available += txn.direction === "debit" ? -txn.amount : txn.amount;
    }
  }

  return { available, vault };
}

export async function ensureWalletForChild(tx: Tx, childId: string) {
  const existing = await tx.wallet.findUnique({ where: { childId } });
  if (existing) return existing;
  return tx.wallet.create({ data: { childId } });
}
