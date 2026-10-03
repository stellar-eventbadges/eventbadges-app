import type { WalletController } from '../hooks/useWallet';
import type { ContractClient } from '../lib/contract';
import type { AppConfig } from '../lib/network';

/** Everything a page needs. Pages hold form state; all logic lives in `lib/`. */
export interface PageProps {
  readonly client: ContractClient;
  readonly config: AppConfig;
  readonly wallet: WalletController;
}
