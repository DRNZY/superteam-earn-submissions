import { PublicKey } from '@solana/web3.js';
import { VolumeRecord, VolumeSummary } from './types.js';

export interface FeeBreakdown {
  grossAmountLamports: bigint;
  netTransferLamports: bigint;
  totalFeeLamports: bigint;
  builderFeeLamports: bigint;
  protocolFeeLamports: bigint;
}

export class FeeCalculator {
  // 0.5% total fee = 50 basis points (bps)
  public static readonly TOTAL_FEE_BPS = 50n;
  // 0.25% integrator/builder share = 25 bps
  public static readonly BUILDER_SHARE_BPS = 25n;
  // 0.25% protocol pool share = 25 bps
  public static readonly PROTOCOL_SHARE_BPS = 25n;
  public static readonly BPS_DIVISOR = 10000n;

  // Minimum qualification threshold in USD for Superteam Earn bounty
  public static readonly BOUNTY_MIN_VOLUME_USD = 100000;

  // Default treasuries (valid 32-byte Solana Base58 public keys)
  public static readonly DEFAULT_PROTOCOL_TREASURY = new PublicKey(
    'q3xodrtcvjH8NfPLMAQbRWqUXW9iH9qd8VxbhqWMiHb'
  );
  public static readonly DEFAULT_BUILDER_TREASURY = new PublicKey(
    '7vBCEUNdZD9WoNmpR6Hp6sLiETgsbq4Gc3eBc5Tjv76d'
  );

  /**
   * Computes the exact fee breakdown in lamports using integer basis points.
   * Total fee: 0.5% (50 bps)
   * Builder split: 0.25% (25 bps)
   * Protocol split: 0.25% (25 bps)
   */
  public static calculateFee(grossAmountLamports: bigint): FeeBreakdown {
    if (grossAmountLamports <= 0n) {
      throw new Error('Gross amount must be positive');
    }

    const totalFeeLamports = (grossAmountLamports * FeeCalculator.TOTAL_FEE_BPS) / FeeCalculator.BPS_DIVISOR;
    const builderFeeLamports = (grossAmountLamports * FeeCalculator.BUILDER_SHARE_BPS) / FeeCalculator.BPS_DIVISOR;
    // Protocol gets the remainder of the fee to guarantee conservation of lamports
    const protocolFeeLamports = totalFeeLamports - builderFeeLamports;
    const netTransferLamports = grossAmountLamports - totalFeeLamports;

    return {
      grossAmountLamports,
      netTransferLamports,
      totalFeeLamports,
      builderFeeLamports,
      protocolFeeLamports
    };
  }

  /**
   * Calculates qualifying transaction volume from collected builder fees.
   * MultiHopper rule: Qualifying volume = collected percentage fees / 0.0025
   */
  public static volumeFromBuilderFee(builderFeeLamports: bigint): bigint {
    return (builderFeeLamports * FeeCalculator.BPS_DIVISOR) / FeeCalculator.BUILDER_SHARE_BPS;
  }
}

/**
 * Volume Tracker for MultiHopper Route Activity
 * Records transactions, tallies production volume, and tracks builder revenue yield.
 */
export class VolumeTracker {
  private records: VolumeRecord[] = [];

  public recordTransfer(record: VolumeRecord): void {
    this.records.push(record);
  }

  public getRecords(): VolumeRecord[] {
    return [...this.records];
  }

  public getSummary(solPriceUsd: number = 180): VolumeSummary {
    let totalGrossVolumeLamports = 0n;
    let totalBuilderYieldLamports = 0n;

    for (const r of this.records) {
      totalGrossVolumeLamports += r.grossVolumeLamports;
      totalBuilderYieldLamports += r.builderFeeLamports;
    }

    const LAMPORTS_PER_SOL = 1000000000n;
    const totalGrossSOL = Number(totalGrossVolumeLamports) / Number(LAMPORTS_PER_SOL);
    const totalBuilderSOL = Number(totalBuilderYieldLamports) / Number(LAMPORTS_PER_SOL);
    const totalVolumeUsd = totalGrossSOL * solPriceUsd;

    return {
      totalTransfers: this.records.length,
      totalGrossVolumeLamports,
      totalGrossVolumeSOL: totalGrossSOL,
      totalBuilderYieldLamports,
      totalBuilderYieldSOL: totalBuilderSOL,
      qualifiesForBounty: totalVolumeUsd >= FeeCalculator.BOUNTY_MIN_VOLUME_USD,
      solPriceUsd,
      totalVolumeUsd
    };
  }

  public reset(): void {
    this.records = [];
  }
}
