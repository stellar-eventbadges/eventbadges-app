import type { ModuleInterface } from '@creit.tech/stellar-wallets-kit/types';

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
 *
 * The kit and its modules come to roughly 220 kB split across their own chunks,
 * and no screen needs any of them before a wallet is used, so the kit is loaded
 * with a dynamic `import()` instead of riding the initial bundle.
 * `prefetchWallet` warms those chunks from the connect button's hover and focus
 * handlers, so the picker still opens without a visible delay.
 */

type KitModule = typeof import('@creit.tech/stellar-wallets-kit');

type KitModules = ModuleInterface[];

interface LoadedKit {
  readonly kit: KitModule;
  readonly modules: KitModules;
}

/**
 * The wallet picker only offers Stellar wallets, and this list is the entire
 * allow-list: the kit's `defaultModules()` bundle also carries `Ledger`,
 * `Trezor`, `WalletConnect`/Reown, `MetaMask`, `OneKey`, `Bitget`, `Dcent`,
 * `Klever`, `CactusLink` and `Ghostsig` (several of them multi-chain, which is
 * where the NEAR and Solana transitives that `npm audit` flags come from).
 *
 * Importing the eight module entry points below instead means those modules are
 * not filtered out of the picker — they are never downloaded, parsed or offered
 * at all. `Keeper` is Stellar but not shipped by this kit version, so it is
 * intentionally absent.
 */
async function loadModules(): Promise<KitModules> {
  const [albedo, freighter, fordefi, rabet, xbull, lobstr, hana, scopuly] = await Promise.all([
    import('@creit.tech/stellar-wallets-kit/modules/albedo'),
    import('@creit.tech/stellar-wallets-kit/modules/freighter'),
    import('@creit.tech/stellar-wallets-kit/modules/fordefi'),
    import('@creit.tech/stellar-wallets-kit/modules/rabet'),
    import('@creit.tech/stellar-wallets-kit/modules/xbull'),
    import('@creit.tech/stellar-wallets-kit/modules/lobstr'),
    import('@creit.tech/stellar-wallets-kit/modules/hana'),
    import('@creit.tech/stellar-wallets-kit/modules/scopuly'),
  ]);
  const modules: ModuleInterface[] = [
    new albedo.AlbedoModule(),
    new freighter.FreighterModule(),
    new fordefi.FordefiModule(),
    new rabet.RabetModule(),
    new xbull.xBullModule(),
    new lobstr.LobstrModule(),
    new hana.HanaModule(),
    new scopuly.ScopulyModule(),
  ];
  localWalletIcons(modules);
  return modules;
}

/**
 * Local copies of the wallet icons in `public/wallet-icons/`. The wallet kit's
 * default `productIcon` is a remote URL on `stellar.creit.tech`, which means
 * opening the picker phones home and leaks the user's IP. Pointing the icons at
 * local files removes that request entirely: the only outside request this app
 * makes is to the RPC endpoint from `.env`.
 */
function localWalletIcons(modules: KitModules): void {
  for (const module of modules) {
    module.productIcon = `/wallet-icons/${module.productId}.png`;
  }
}

let loaded: Promise<LoadedKit> | null = null;

async function loadKitChunk(): Promise<LoadedKit> {
  try {
    const [kit, modules] = await Promise.all([
      import('@creit.tech/stellar-wallets-kit'),
      loadModules(),
    ]);
    return { kit, modules };
  } catch (thrown) {
    // A chunk that failed to load (offline, a redeploy mid-session) must not be
    // remembered as permanent: the next attempt should fetch it again.
    loaded = null;
    throw thrown;
  }
}

/** Fetches the wallet kit's chunk once. */
function loadKit(): Promise<LoadedKit> {
  loaded ??= loadKitChunk();
  return loaded;
}

/**
 * Starts fetching the wallet kit without initialising it, for callers that know
 * a connect is likely (button hover or focus). Failure is ignored on purpose:
 * nothing is attempted against the kit, and the real click path reports errors.
 */
export async function prefetchWallet(): Promise<void> {
  try {
    await loadKit();
  } catch {
    // The connect path will load it again and surface the failure there.
  }
}

let initialised: Promise<void> | null = null;

async function initKit(): Promise<void> {
  try {
    const { kit, modules } = await loadKit();
    kit.StellarWalletsKit.init({
      modules,
      // Pinned to testnet: the kit will not be asked for any other network.
      network: kit.Networks.TESTNET,
    });
  } catch (thrown) {
    initialised = null;
    throw thrown;
  }
}

/** Initialises the kit once, after its chunk has loaded. Safe to call from an effect. */
export function initWallet(): Promise<void> {
  initialised ??= initKit();
  return initialised;
}

/** Initialises the kit and returns it, for the calls below that need it. */
async function readyKit(): Promise<KitModule> {
  await initWallet();
  return (await loadKit()).kit;
}

/** Opens the wallet picker and returns the connected public address. */
export async function connectWallet(): Promise<string> {
  const { StellarWalletsKit } = await readyKit();
  const { address } = await StellarWalletsKit.authModal();
  if (address === '') {
    throw new Error('The wallet did not return an address.');
  }
  return address;
}

/** Returns the address the kit already remembers, or null if none. */
export async function rememberedAddress(): Promise<string | null> {
  const { StellarWalletsKit } = await readyKit();
  try {
    const { address } = await StellarWalletsKit.getAddress();
    return address === '' ? null : address;
  } catch {
    return null;
  }
}

export async function disconnectWallet(): Promise<void> {
  const { StellarWalletsKit } = await readyKit();
  await StellarWalletsKit.disconnect();
}

/** Asks the wallet to sign an unsigned transaction XDR. */
export async function signWithWallet(
  xdr: string,
  address: string,
  passphrase: string,
): Promise<string> {
  const { StellarWalletsKit } = await readyKit();
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
  const { StellarWalletsKit } = await readyKit();
  const { networkPassphrase } = await StellarWalletsKit.getNetwork();
  return { onTestnet: isTestnetPassphrase(networkPassphrase), passphrase: networkPassphrase };
}
