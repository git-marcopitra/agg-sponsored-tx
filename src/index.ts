import { normalizeStructTag, SUI_TYPE_ARG } from "@mysten/sui/utils";
import {
  Argument,
  Transaction,
  TransactionArgument,
} from "@mysten/sui/transactions";
import {
  USER_WALLET,
  COIN_OUT,
  GAS_STATION_CLIENT,
  HOP_SDK,
  SHINAMI_CLIENT,
  DCA_SDK,
} from "./constants";
import { buildGaslessTransactionCustom } from "./utils";

const trade = async (
  tx: Transaction,
  coinInType: string,
  coinOutType: string,
  coinInAmount: bigint,
  coinInNested: { $kind: "NestedResult"; NestedResult: [number, number] },
  address: string
) => {
  const objectTypeIn = `0x2::coin::Coin<${coinInType}>`;

  const coinIn = tx.moveCall({
    target:
      "0x10e5b474360737ecc1c2c46f9f155199813320813d0fd5926e036a203f93c652::utils::to_result",
    typeArguments: [objectTypeIn],
    arguments: [coinInNested],
  }) as { $kind: "Result"; Result: number };

  console.log(
    ">> step 2 :: ",
    {
      tx,
      coinIn,
      address,
      coinInType,
      coinOutType,
      coinInAmount,
    },
    " :: step 2 <<"
  );

  const { trade } = await HOP_SDK.fetchQuote({
    amount_in: coinInAmount,
    token_in: normalizeStructTag(coinInType),
    token_out: normalizeStructTag(coinOutType),
  });

  console.log(">> step 3 :: ", trade, " :: step 3 <<");

  const response = await HOP_SDK.fetchTx({
    trade,
    sponsored: true,
    gas_budget: 1e8,
    base_transaction: tx,
    input_coin_argument: coinIn,
    return_output_coin_argument: true,
    sui_address: address,
  });

  console.log(">> step 4 :: ", response, " :: step 4 <<");

  return response;
};

const dcaTrade = async () => {
  // run pnpm test:dca to get a new dca ID
  const dcaId =
    "0xc9f935f52e81edc1b263988a9e98cd7f2a63366565f2362a8a89d61e0c96dcd7";

  const coinOutType = SUI_TYPE_ARG;
  const coinInType = COIN_OUT;
  const coinInAmount = 100_000n;
  const address = USER_WALLET.toSuiAddress();

  const { tx, request, coinIn } = DCA_SDK.swapWhitelistStart({
    dca: dcaId,
    coinInType: coinInType,
    coinOutType: coinOutType,
  });

  console.log(">> step 1 :: ", { tx, request, coinIn }, " :: step 1 <<");

  const { transaction, output_coin } = await trade(
    tx,
    coinInType,
    coinOutType,
    coinInAmount,
    coinIn,
    address
  );

  console.log(
    ">> step 5 :: ",
    {
      transaction,
      dcaId,
      request,
      output_coin,
      coinInType,
      coinOutType,
    },
    " :: step 5 <<"
  );

  return DCA_SDK.swapWhitelistEnd({
    tx: transaction,
    dca: dcaId,
    request,
    coinOut: {
      $kind: (output_coin as any).kind,
      Result: (output_coin as any).index,
    } as TransactionArgument,
    coinInType: coinInType,
    coinOutType: coinOutType,
  });
};

const test = async () => {
  console.log(">> step 0 <<");

  const tx = await dcaTrade();

  console.log(">> step 6 :: ", tx, " :: step 6 <<");

  const gaslessTx = await buildGaslessTransactionCustom(tx, {
    sui: SHINAMI_CLIENT,
    sender: USER_WALLET.toSuiAddress(),
  });

  console.log(">> step 7 :: ", gaslessTx, GAS_STATION_CLIENT, " :: step 7 <<");
  const sponsoredResponse = await GAS_STATION_CLIENT.sponsorTransaction(
    gaslessTx
  );

  console.log(">> step 8 :: ", sponsoredResponse, " :: step 8 <<");

  const senderSignature = await Transaction.from(
    sponsoredResponse.txBytes
  ).sign({ signer: USER_WALLET });

  console.log(">> step 9 :: ", senderSignature, " :: step 9 <<");

  const executeResponse = await SHINAMI_CLIENT.executeTransactionBlock({
    transactionBlock: sponsoredResponse.txBytes,
    signature: [senderSignature.signature, sponsoredResponse.signature],
    requestType: "WaitForEffectsCert",
  });

  console.log(">> step 10 :: ", executeResponse, " :: step 10 <<");

  await SHINAMI_CLIENT.waitForTransaction({
    digest: executeResponse.digest,
  });

  console.log(">> step 11 :: ", executeResponse, " :: step 11 <<");

  return executeResponse;
};

test();
