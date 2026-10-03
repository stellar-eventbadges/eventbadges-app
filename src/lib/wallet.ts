import { Networks, StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';
import { defaultModules } from '@creit.tech/stellar-wallets-kit/modules/utils';

import { isTestnetPassphrase } from './network';

/**
 * The wallet adapter, over Stellar Wallets Kit (`@creit.tech/stellar-wallets-kit`).
 *
 * The kit only ever hands the app a public address and a signed XDR. This module
 * never asks for, receives, stores or logs a secret key or seed phrase — that is
 * a project rule, not just a convention, and there is no code path here that
 * could do it.
 *
 * The kit is initialised once, pinned to testnet, and every session is
 * re-checked against the testnet passphrase before the app will build a
 * transaction (`assertWalletOnTestnet` happens in `flow.ts`).
 */

/**
 * The wallet picker only shows wallets the kit ships as `HOT_WALLET` modules AND
 * that are Stellar-only. The kit's `ModuleType` enum cannot separate a Stellar
 * wallet from a multi-chain one — `Bitget`, `Dcent` and `OneKey` are all
 * `HOT_WALLET` — so the filter is by `productId` against this list instead.
 *
 * Non-Stellar / multi-chain modules (`Bitget`, `Dcent`, `OneKey`, `Trezor`,
 * `MetaMask`, ...) are excluded, which is also what drops most of the NEAR and
 * Solana transitives that `npm audit` flags. `Keeper` is Stellar but not shipped
 * by this kit version, so it is intentionally absent.
 */
const STELLAR_WALLET_IDS: ReadonlySet<string> = new Set([
  'albedo',
  'freighter',
  'lobstr',
  'xbull',
  'rabet',
  'hana',
  'fordefi',
  'scopuly',
]);

/**
 * Local copies of the wallet icons in `public/wallet-icons/`. The wallet kit's
 * default `productIcon` is a remote URL on `stellar.creit.tech`, which means
 * opening the picker phones home and leaks the user's IP. Pointing the icons at
 * local files removes that request entirely: the only outside request this app
 * makes is to the RPC endpoint from `.env`.
 */
function localWalletIcons(modules: ReturnType<typeof defaultModules>): void {
  for (const module of modules) {
    module.productIcon = `/wallet-icons/${module.productId}.png`;
  }
}

let initialised = false;

/** Initialises the kit once. Safe to call from an effect. */
export function initWallet(): void {
  if (initialised) return;
  const modules = defaultModules({
    filterBy: (module) => STELLAR_WALLET_IDS.has(module.productId),
  });
  localWalletIcons(modules);
  StellarWalletsKit.init({
    modules,
    // Pinned to testnet: the kit will not be asked for any other network.
    network: Networks.TESTNET,
  });
  initialised = true;
}

/** Opens the wallet picker and returns the connected public address. */
export async function connectWallet(): Promise<string> {
  initWallet();
  const { address } = await StellarWalletsKit.authModal();
  if (address === '') {
    throw new Error('The wallet did not return an address.');
  }
  return address;
}

/** Returns the address the kit already remembers, or null if none. */
export async function rememberedAddress(): Promise<string | null> {
  initWallet();
  try {
    const { address } = await StellarWalletsKit.getAddress();
    return address === '' ? null : address;
  } catch {
    return null;
  }
}

export async function disconnectWallet(): Promise<void> {
  initWallet();
  await StellarWalletsKit.disconnect();
}

/** Asks the wallet to sign an unsigned transaction XDR. */
export async function signWithWallet(
  xdr: string,
  address: string,
  passphrase: string,
): Promise<string> {
  initWallet();
  const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
    networkPassphrase: passphrase,
    address,
  });
  return signedTxXdr;
}

export interface WalletNetworkCheck {
  readonly onTestnet: boolean;
  readonly passphrase: string;
}

/**
 * Reads the network the wallet is currently set to and reports whether it is
 * testnet. The app refuses to act when this is false.
 */
export async function checkWalletNetwork(): Promise<WalletNetworkCheck> {
  initWallet();
  const { networkPassphrase } = await StellarWalletsKit.getNetwork();
  return { onTestnet: isTestnetPassphrase(networkPassphrase), passphrase: networkPassphrase };
}
