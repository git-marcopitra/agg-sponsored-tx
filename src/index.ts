import { normalizeStructTag, SUI_TYPE_ARG } from "@mysten/sui/utils";
import { Transaction, TransactionArgument } from "@mysten/sui/transactions";
import {
  USER_WALLET,
  COIN_OUT,
  GAS_STATION_CLIENT,
  HOP_SDK,
  SHINAMI_CLIENT,
  DCA_SDK,
} from "./constants";
import { buildGaslessTransactionCustom, getCoinOfValue } from "./utils";

const trade = async (
  tx: Transaction,
  coinInType: string,
  coinOutType: string,
  coinInAmount: bigint,
  coinIn: { $kind: "NestedResult"; NestedResult: [number, number] },
  address: string
) => {
  console.log(
    ">> step 1 :: ",
    {
      tx,
      coinIn,
      address,
      coinInType,
      coinOutType,
      coinInAmount,
    },
    " :: step 1 <<"
  );

  const { trade } = await HOP_SDK.fetchQuote({
    amount_in: coinInAmount,
    token_in: normalizeStructTag(coinInType),
    token_out: normalizeStructTag(coinOutType),
  });

  console.log(">> step 2 :: ", trade, " :: step 2 <<");

  const response = await HOP_SDK.fetchTx({
    trade,
    sponsored: true,
    gas_budget: 1e8,
    base_transaction: tx,
    input_coin_argument: coinIn,
    return_output_coin_argument: true,
    sui_address: address,
  });

  console.log(">> step 3 :: ", response, " :: step 3 <<");

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

  const { transaction, output_coin } = await trade(
    tx,
    coinInType,
    coinOutType,
    coinInAmount,
    coinIn,
    address
  );

  return DCA_SDK.swapWhitelistEnd({
    tx: transaction,
    dca: dcaId,
    request,
    coinOut: output_coin!,
    coinInType: coinInType,
    coinOutType: coinOutType,
  });
};

const test = async () => {
  console.log(">> step 0 <<");

  const tx = await dcaTrade();

  const gaslessTx = await buildGaslessTransactionCustom(tx, {
    sui: SHINAMI_CLIENT,
    sender: USER_WALLET.toSuiAddress(),
  });

  console.log(">> step 4 :: ", gaslessTx, GAS_STATION_CLIENT, " :: step 4 <<");
  const sponsoredResponse = await GAS_STATION_CLIENT.sponsorTransaction(
    gaslessTx
  );

  console.log(">> step 5 :: ", sponsoredResponse, " :: step 5 <<");

  const senderSignature = await Transaction.from(
    sponsoredResponse.txBytes
  ).sign({ signer: USER_WALLET });

  console.log(">> step 6 :: ", senderSignature, " :: step 6 <<");

  const executeResponse = await SHINAMI_CLIENT.executeTransactionBlock({
    transactionBlock: sponsoredResponse.txBytes,
    signature: [senderSignature.signature, sponsoredResponse.signature],
    requestType: "WaitForEffectsCert",
  });

  console.log(">> step 7 :: ", executeResponse, " :: step 7 <<");

  await SHINAMI_CLIENT.waitForTransaction({
    digest: executeResponse.digest,
  });

  console.log(">> step 8 :: ", executeResponse, " :: step 8 <<");

  return executeResponse;
};

test();
