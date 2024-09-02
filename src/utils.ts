import { OwnedObjectRef, SuiClient, SuiTransactionBlockResponse } from "@mysten/sui/client";
import { Transaction, TransactionResult } from "@mysten/sui/transactions";
import { normalizeStructTag, SUI_TYPE_ARG, toB64 } from "@mysten/sui/utils";
import { GaslessTransaction } from "@shinami/clients/sui";
import { SUI_CLIENT, USER_WALLET } from "./constants";

export async function buildGaslessTransactionCustom(
  tx: Transaction,
  options?: {
    sender?: string;
    gasBudget?: number | string;
    gasPrice?: number | string;
    sui?: SuiClient;
  }
): Promise<GaslessTransaction> {
  const txData = tx.getData();

  return {
    txKind: toB64(
      await tx.build({ client: options?.sui, onlyTransactionKind: true })
    ),
    sender: options?.sender ?? txData.sender ?? undefined,
    gasBudget: options?.gasBudget ?? txData.gasData.budget ?? undefined,
    gasPrice: options?.gasPrice ?? txData.gasData.price ?? undefined,
  };
}

export async function getCoinOfValue(
  tx: Transaction,
  coinType: string,
  coinValue: bigint
): Promise<TransactionResult> {
  let coinOfValue: TransactionResult;
  if (normalizeStructTag(coinType) === normalizeStructTag(SUI_TYPE_ARG)) {
    coinOfValue = tx.splitCoins(tx.gas, [tx.pure.u64(coinValue)]);
  } else {
    const paginatedCoins = await SUI_CLIENT.getCoins({
      owner: USER_WALLET.toSuiAddress(),
      coinType,
    });

    const [firstCoin, ...otherCoins] = paginatedCoins.data;

    const firstCoinInput = tx.object(firstCoin.coinObjectId);

    if (otherCoins.length > 0) {
      tx.mergeCoins(
        firstCoinInput,
        otherCoins.map((coin) => coin.coinObjectId)
      );
    }
    coinOfValue = tx.splitCoins(firstCoinInput, [tx.pure.u64(coinValue)]);
  }
  return coinOfValue;
}


export const getObjectIdFromTxResult = (
  txResult: SuiTransactionBlockResponse
) =>
  txResult.effects?.created!.map(
    (item: OwnedObjectRef) => item.reference.objectId
  )[0];

