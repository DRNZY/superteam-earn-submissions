import { Keypair, PublicKey } from '@solana/web3.js';

export interface RouteConfig {
  source: PublicKey;
  destination: PublicKey;
  amountLamports: bigint;
  hopCount?: number;
  jitterMinMs?: number;
  jitterMaxMs?: number;
  builderTreasury?: PublicKey;
  protocolTreasury?: PublicKey;
}

export interface HopDefinition {
  hopIndex: number;
  ephemeralKeypair: Keypair;
  amountLamports: bigint;
  delayMs: number;
}

export interface RoutePlan {
  id: string;
  source: PublicKey;
  destination: PublicKey;
  grossAmountLamports: bigint;
  netTransferLamports: bigint;
  totalFeeLamports: bigint;
  builderFeeLamports: bigint;
  protocolFeeLamports: bigint;
  builderTreasury: PublicKey;
  protocolTreasury: PublicKey;
  hops: HopDefinition[];
  createdAt: number;
}

export interface MultiSendRecipient {
  destination: PublicKey;
  amountLamports: bigint;
}

export interface MultiSendPlan {
  id: string;
  source: PublicKey;
  recipients: MultiSendRecipient[];
  grossAmountLamports: bigint;
  netTransferLamports: bigint;
  totalFeeLamports: bigint;
  builderFeeLamports: bigint;
  protocolFeeLamports: bigint;
  hopsPerRecipient: number;
  createdAt: number;
}

export interface ComplianceReport {
  address: string;
  isCompliant: boolean;
  riskScore: number; // 0 (clean) to 100 (high risk)
  flags: string[];
  screenedAt: number;
}

export interface ExecutionHopResult {
  hopIndex: number;
  from: string;
  to: string;
  amountLamports: bigint;
  signature?: string;
  simulated: boolean;
  timestamp: number;
}

export interface RouteExecutionResult {
  routeId: string;
  success: boolean;
  hopResults: ExecutionHopResult[];
  feeSignatures?: string[];
  totalLamportsRouted: bigint;
  builderYieldLamports: bigint;
  error?: string;
  durationMs: number;
}

export interface VolumeRecord {
  timestamp: number;
  routeId: string;
  grossVolumeLamports: bigint;
  builderFeeLamports: bigint;
  protocolFeeLamports: bigint;
}

export interface VolumeSummary {
  totalTransfers: number;
  totalGrossVolumeLamports: bigint;
  totalGrossVolumeSOL: number;
  totalBuilderYieldLamports: bigint;
  totalBuilderYieldSOL: number;
  qualifiesForBounty: boolean; // >= $100,000 threshold
  solPriceUsd: number;
  totalVolumeUsd: number;
}
