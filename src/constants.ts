import { HopApi } from "@hop.ag/sdk";
import { DcaSDK, PACKAGES, SHARED_OBJECTS } from "@interest-protocol/dca-sdk";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { createSuiClient, GasStationClient } from "@shinami/clients/sui";
import * as dotenv from "dotenv";
import invariant from "tiny-invariant";

dotenv.config();

invariant(process.env.SHINAMI_GAS_AND_NODE_ACCESS_KEY, "Missing Shinami Key");
invariant(process.env.FEE_WALLET, "Missing Fee Wallet");
invariant(process.env.HOP_API_KEY, "Missing Hop API key");
invariant(process.env.WALLET_SECRET_KEY, "Missing Hop Secret Key");

export const COIN_OUT =
  "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN";

export const SHINAMI_CLIENT = createSuiClient(
  process.env.SHINAMI_GAS_AND_NODE_ACCESS_KEY
);

export const GAS_STATION_CLIENT = new GasStationClient(
  process.env.SHINAMI_GAS_AND_NODE_ACCESS_KEY
);

export const FEE_WALLET = process.env.FEE_WALLET;

const RPC = getFullnodeUrl("mainnet");

export const SUI_CLIENT = new SuiClient({ url: RPC });

export const DCA_SDK = new DcaSDK({
  network: "mainnet",
  fullNodeUrl: getFullnodeUrl("mainnet"),
  packages: PACKAGES.mainnet,
  sharedObjects: SHARED_OBJECTS.mainnet,
});

export const HOP_SDK = new HopApi(RPC, {
  api_key: process.env.HOP_API_KEY ?? "",
  fee_bps: 100,
  fee_wallet: FEE_WALLET ?? "",
});

export const USER_WALLET = Ed25519Keypair.fromSecretKey(
  Uint8Array.from(Buffer.from(process.env.WALLET_SECRET_KEY!, "base64")).slice(
    1
  )
);
