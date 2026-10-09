import type { PageProps } from './shared';

type Destination = 'organizer' | 'attendee' | 'verify';
interface HomeProps extends PageProps { readonly onNavigate?: (page: Destination) => void }

export function HomePage({ config, onNavigate }: HomeProps) {
  return (
    <section className="landing">
      <div className="hero">
        <div className="hero-copy">
          <p className="hero-context">For the moments that bring us together.</p>
          <h1>A moment together.<br />Yours to keep.</h1>
          <p className="hero-lead">A small record of being there. Claim an attendance badge, keep it with your wallet, and let anyone verify it.</p>
          <div className="hero-actions">
            <button type="button" onClick={() => onNavigate?.('attendee')}>Claim a badge</button>
            <button className="text-button" type="button" onClick={() => onNavigate?.('verify')}>Verify attendance</button>
          </div>
          <p className="hero-note">Have a ticket from your organizer? You’re ready to begin.</p>
        </div>
        <figure className="hero-art">
          <img src="/brand/badge-sculpture.svg" width="640" height="720" alt="" aria-hidden="true" />
          <figcaption>A keepsake, reimagined as a digital record.</figcaption>
        </figure>
      </div>

      <section className="organizer-invitation" aria-labelledby="organizer-title">
        <div><p className="section-label">Bring your community together.</p><h2 id="organizer-title">Make the moment count.</h2></div>
        <div><p>Create an event, give each attendee their own ticket, and manage the badges you issue. The names and contact details stay off chain.</p><button className="secondary" type="button" onClick={() => onNavigate?.('organizer')}>Organize an event</button></div>
      </section>

      <section className="how-it-works" aria-labelledby="how-title">
        <h2 id="how-title">One ticket. Your badge.</h2>
        <ol>
          <li><span className="step-number" aria-hidden="true">1</span><h3>Get your ticket.</h3><p>Your organizer shares an event id and a personal, single-use claim ticket.</p></li>
          <li><span className="step-number" aria-hidden="true">2</span><h3>Make it yours.</h3><p>Paste or scan the ticket, read the privacy notice, and sign with your testnet wallet.</p></li>
          <li><span className="step-number" aria-hidden="true">3</span><h3>Keep the record.</h3><p>Your badge stays with your address. It cannot be transferred, and anyone can verify it.</p></li>
        </ol>
      </section>

      <details className="project-status">
        <summary>A testnet prototype. Here’s what to know.</summary>
        <div className="status-copy">
          <p>The contract has a verified synthetic testnet demonstration. Real browser-wallet flows are still pending. No pilot has happened, and there has been no security review or audit.</p>
          <p>Attendance is public and linked to a wallet address. A badge records an address’s attendance claim; it does not establish a person’s identity. Organizers can revoke badges, while historical transactions remain public.</p>
          <p>QR scanning and local badge artwork are implemented. There is no event attendee roster; CSV downloads contain only records the current page has read.</p>
          <p><a href="https://github.com/stellar-eventbadges/eventbadges-contracts/blob/main/docs/TESTNET_DEMONSTRATION.md" target="_blank" rel="noreferrer">Read the synthetic demonstration record</a></p>
          <p className="hint mono">Contract: {config.contractId}</p>
        </div>
      </details>
    </section>
  );
}
