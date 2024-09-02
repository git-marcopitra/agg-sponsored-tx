import { normalizeStructTag, SUI_TYPE_ARG } from "@mysten/sui/utils";
import { Transaction } from "@mysten/sui/transactions";
import {
  USER_WALLET,
  COIN_OUT,
  GAS_STATION_CLIENT,
  HOP_SDK,
  FEE_WALLET,
  SHINAMI_CLIENT,
} from "./constants";
import { Aftermath } from "aftermath-ts-sdk";
import { buildGaslessTransaction } from "@shinami/clients/sui";

enum Agg {
  Hop,
  Aftermath,
}

const hopTrade = async (tx: Transaction) => {
  const coinInType = SUI_TYPE_ARG;
  const coinOutType = COIN_OUT;
  const coinInAmount = 10_000_000n;
  const address = USER_WALLET;
  const coinIn = tx.splitCoins(tx.gas, [tx.pure.u64(coinInAmount)]);

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

  // tx.setSender(address.toSuiAddress());

  console.log(">> step 2 :: ", trade, " :: step 2 <<");

  const response = await HOP_SDK.fetchTx({
    trade,
    sponsored: true,
    gas_budget: 1e8,
    base_transaction: tx,
    input_coin_argument: coinIn,
    return_output_coin_argument: true,
    sui_address: address.toSuiAddress(),
  });

  console.log(">> step 3 :: ", response, " :: step 3 <<");

  return response;
};

const afRouterSdk = new Aftermath("MAINNET").Router();

const afTrade = async (tx: Transaction) => {
  const coinInType = SUI_TYPE_ARG;
  const coinOutType = COIN_OUT;
  const coinInAmount = 10_000_000n;
  const address = USER_WALLET;
  const coinIn = tx.splitCoins(tx.gas, [tx.pure.u64(coinInAmount)]);

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
  const route = await afRouterSdk.getCompleteTradeRouteGivenAmountIn({
    coinInType,
    coinOutType,
    coinInAmount,
    referrer: FEE_WALLET,
    externalFee: { recipient: FEE_WALLET, feePercentage: 1 },
  });
  console.log(">> step 2 :: ", route), " :: step 2 <<";

  const { tx: transaction, coinOutId } =
    await afRouterSdk.addTransactionForCompleteTradeRoute({
      tx,
      coinInId: coinIn,
      isSponsoredTx: true,
      completeRoute: route,
      slippage: 1,
      walletAddress: address.toSuiAddress(),
    });

  console.log(">> step 3 :: ", transaction, " :: step 3 <<");

  return {
    transaction,
    output: coinOutId!,
  };
};

const trade = (agg: Agg, tx: Transaction) => {
  if (agg === Agg.Hop) return hopTrade(tx);

  return afTrade(tx);
};

const test = async (agg: Agg) => {
  console.log(">> step 0 <<");

  const gaslessTx = await buildGaslessTransaction(
    async (tx) => {
      await trade(agg, tx);
    },
    {
      sui: SHINAMI_CLIENT,
      sender: USER_WALLET.toSuiAddress(),
    }
  );

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

test(Agg.Hop);
