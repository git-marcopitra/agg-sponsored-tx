import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { toB64 } from "@mysten/sui/utils";
import { GaslessTransaction } from "@shinami/clients/sui";

export async function buildGaslessTransactionCustom(
  tx: Transaction,
  options?: {
    sender?: string;
    gasBudget?: number | string;
    gasPrice?: number | string;
    sui?: SuiClient;
  },
): Promise<GaslessTransaction> {
  const txData = tx.getData();

  return {
    txKind: toB64(
      await tx.build({ client: options?.sui, onlyTransactionKind: true }),
    ),
    sender: options?.sender ?? txData.sender ?? undefined,
    gasBudget: options?.gasBudget ?? txData.gasData.budget ?? undefined,
    gasPrice: options?.gasPrice ?? txData.gasData.price ?? undefined,
  };
}
