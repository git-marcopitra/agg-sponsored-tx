import { SUI_TYPE_ARG } from "@mysten/sui/utils";
import { Transaction } from "@mysten/sui/transactions";
import { COIN_OUT, DCA_SDK, SUI_CLIENT, USER_WALLET } from "./constants";
import { getCoinOfValue, getObjectIdFromTxResult } from "./utils";
import { WITNESSES } from "@interest-protocol/dca-sdk";

(async () => {
  try {
    const initTx = new Transaction();

    const coinIn = await getCoinOfValue(initTx, COIN_OUT, 10_000n);

    const tx = DCA_SDK.newAndShare({
      tx: initTx,
      coinInType: COIN_OUT,
      coinOutType: SUI_TYPE_ARG,
      coinIn: coinIn,
      timeScale: 0,
      every: 30,
      numberOfOrders: 2,
      delegatee: USER_WALLET.toSuiAddress(),
      witnessType: WITNESSES.mainnet.WHITELIST_ADAPTER,
    });

    const result = await SUI_CLIENT.signAndExecuteTransaction({
      signer: USER_WALLET,
      transaction: tx,
      options: {
        showEffects: true,
      },
      requestType: "WaitForLocalExecution",
    });

    // return if the tx hasn't succeed
    if (result.effects?.status?.status !== "success") {
      console.log("\n\nCreating a new stable pool failed");
      return;
    }

    const dcaId = getObjectIdFromTxResult(result);

    console.log(">> This is your DCA ID :: ", dcaId);
  } catch (e) {
    console.log(e);
  }
})();
