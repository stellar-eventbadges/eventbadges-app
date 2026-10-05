import { ConnectPrompt } from '../components/ConnectPrompt';
import { WalletBar } from '../components/WalletBar';
import type { PageProps } from './shared';

/**
 * The landing page: what the app is, who it is for, and the wallet connection.
 * It also states plainly what has not happened yet, because a reader who lands
 * here should not have to hunt for that.
 */
export function HomePage({ config, wallet }: PageProps) {
  return (
    <section>
      <h1>Attendance badges that cannot be faked or sold</h1>

      <p>
        <strong>eventbadges</strong> lets a community organizer record an event on Stellar&rsquo;s
        test network. Attendees claim a badge with a secret claim code; the badge is bound to their
        own address and cannot be transferred — there is no way to move it, which is what makes the
        proof worth something.
      </p>

      <WalletBar wallet={wallet} />

      {wallet.address === null && <ConnectPrompt wallet={wallet} />}

      <div className="card">
        <h2>What you can do here</h2>
        <ol>
          <li>
            <strong>Organizer:</strong> record an event with a badge cap and a claim deadline, and
            generate a random claim code whose hash goes on-chain.
          </li>
          <li>
            <strong>Attendee:</strong> claim your badge by entering the code the organizer gave you.
          </li>
          <li>
            <strong>Organizer:</strong> award a badge to someone who cannot claim, or revoke one
            issued in error.
          </li>
          <li>
            <strong>Anyone:</strong> verify that an address holds a badge for an event — no account
            needed for that.
          </li>
        </ol>
      </div>

      <div className="card">
        <h2>What has not happened yet</h2>
        <ul>
          <li>No pilot has happened, and nothing is deployed until a real organizer agrees to try it.</li>
          <li>
            This app has never run against a deployed contract or a real wallet, so no flow here has
            been exercised end to end yet.
          </li>
          <li>There has been no security review or audit. Do not treat this as safe for real money.</li>
          <li>
            Badge artwork is a local drawing of the badge&rsquo;s own bytes, not an uploaded image,
            and the app still cannot scan QR codes or list an event&rsquo;s attendees (the contract
            deliberately stores no such list). A CSV download holds only the records the page has
            just read, never the whole event.
          </li>
        </ul>
        <p className="hint mono">Contract: {config.contractId}</p>
      </div>
    </section>
  );
}
