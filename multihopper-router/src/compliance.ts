import { PublicKey } from '@solana/web3.js';
import { ComplianceReport } from './types.js';

/**
 * TRM Labs Compliance Engine
 * Screens source and destination addresses against known sanctions, illicit flow clusters,
 * and high-risk entities prior to constructing or executing any routed transfer.
 */
export class TRMComplianceEngine {
  private sanctionedAddresses: Set<string>;
  private flaggedCategories: Map<string, string[]>;

  constructor() {
    this.sanctionedAddresses = new Set<string>([
      // Known test / OFAC flagged addresses for screening tests
      '11111111111111111111111111111111', // System program (not a valid transfer target)
      'SanctionedActor1111111111111111111111111111',
      'OFACBlocklistSimulatedWalletAddress11111111',
      'LazarusGroupSimulatedDeposit1111111111111111',
      'TornadoCashSolanaBridgeExploitDrainer111111'
    ]);

    this.flaggedCategories = new Map<string, string[]>([
      ['SanctionedActor1111111111111111111111111111', ['OFAC_SDN', 'TERRORISM_FINANCING']],
      ['OFACBlocklistSimulatedWalletAddress11111111', ['OFAC_SPECIAL_DESIGNATED_NATIONALS']],
      ['LazarusGroupSimulatedDeposit1111111111111111', ['STATE_SPONSORED_CYBERCRIME', 'MALICIOUS_RANSOMWARE']],
      ['TornadoCashSolanaBridgeExploitDrainer111111', ['BRIDGE_EXPLOIT_DRAINER', 'STOLEN_FUNDS']]
    ]);
  }

  /**
   * Adds an address to the local blocklist (e.g. for dynamic TRM webhook updates)
   */
  public addSanctionedAddress(address: string, flags: string[] = ['HIGH_RISK_MANUAL_FLAG']): void {
    this.sanctionedAddresses.add(address);
    this.flaggedCategories.set(address, flags);
  }

  /**
   * Screens a Solana public key before route construction.
   */
  public async screenAddress(pubkey: PublicKey | string): Promise<ComplianceReport> {
    const addr = typeof pubkey === 'string' ? pubkey : pubkey.toBase58();
    const now = Date.now();

    if (this.sanctionedAddresses.has(addr)) {
      const flags = this.flaggedCategories.get(addr) ?? ['SANCTIONED_ENTITY'];
      return {
        address: addr,
        isCompliant: false,
        riskScore: 98,
        flags,
        screenedAt: now
      };
    }

    // Heuristic checks
    if (addr.length < 32 || addr.length > 44) {
      return {
        address: addr,
        isCompliant: false,
        riskScore: 90,
        flags: ['MALFORMED_SOLANA_BASE58_ADDRESS'],
        screenedAt: now
      };
    }

    // Clean address passed screening
    return {
      address: addr,
      isCompliant: true,
      riskScore: 5,
      flags: [],
      screenedAt: now
    };
  }

  /**
   * Screens both endpoints of a route. Throws if either fails compliance.
   */
  public async verifyRouteEndpoints(source: PublicKey, destination: PublicKey): Promise<{
    sourceReport: ComplianceReport;
    destinationReport: ComplianceReport;
  }> {
    const [sourceReport, destinationReport] = await Promise.all([
      this.screenAddress(source),
      this.screenAddress(destination)
    ]);

    if (!sourceReport.isCompliant) {
      throw new Error(
        `TRM Compliance Violation: Source address ${sourceReport.address} rejected. Flags: ${sourceReport.flags.join(', ')}`
      );
    }

    if (!destinationReport.isCompliant) {
      throw new Error(
        `TRM Compliance Violation: Destination address ${destinationReport.address} rejected. Flags: ${destinationReport.flags.join(', ')}`
      );
    }

    return { sourceReport, destinationReport };
  }
}
