import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { FeeCalculator, VolumeTracker } from '../src/fee.js';
import { TRMComplianceEngine } from '../src/compliance.js';
import { MultiHopperRouter } from '../src/router.js';

describe('MultiHopper Router Test Suite', () => {
  describe('Fee Calculation and Conservation', () => {
    it('accurately calculates 0.50% total fee with 0.25% builder / 0.25% protocol splits', () => {
      const gross = 10n * BigInt(LAMPORTS_PER_SOL); // 10 SOL
      const breakdown = FeeCalculator.calculateFee(gross);

      assert.equal(breakdown.grossAmountLamports, 10_000_000_000n);
      assert.equal(breakdown.totalFeeLamports, 50_000_000n); // 0.5%
      assert.equal(breakdown.builderFeeLamports, 25_000_000n); // 0.25%
      assert.equal(breakdown.protocolFeeLamports, 25_000_000n); // 0.25%
      assert.equal(breakdown.netTransferLamports, 9_950_000_000n);

      // Strict conservation of lamports
      assert.equal(
        breakdown.netTransferLamports + breakdown.builderFeeLamports + breakdown.protocolFeeLamports,
        breakdown.grossAmountLamports
      );
    });

    it('rejects non-positive gross amounts', () => {
      assert.throws(() => FeeCalculator.calculateFee(0n), /Gross amount must be positive/);
      assert.throws(() => FeeCalculator.calculateFee(-1000n), /Gross amount must be positive/);
    });

    it('derives volume from builder fee correctly according to MultiHopper formula', () => {
      // 0.25% fee on $1,000,000 is $2,500
      const builderFee = 25_000_000n; // 0.025 SOL
      const derivedVolume = FeeCalculator.volumeFromBuilderFee(builderFee);
      assert.equal(derivedVolume, 10_000_000_000n); // 10 SOL
    });
  });

  describe('TRM Labs Compliance Engine', () => {
    it('approves clean Solana public keys', async () => {
      const engine = new TRMComplianceEngine();
      const cleanKp = await Keypair.generate();
      const report = await engine.screenAddress(cleanKp.publicKey);

      assert.equal(report.isCompliant, true);
      assert.equal(report.riskScore, 5);
      assert.equal(report.flags.length, 0);
    });

    it('blocks known sanctioned addresses and returns risk flags', async () => {
      const engine = new TRMComplianceEngine();
      const sanctioned = 'OFACBlocklistSimulatedWalletAddress11111111';
      const report = await engine.screenAddress(sanctioned);

      assert.equal(report.isCompliant, false);
      assert.equal(report.riskScore, 98);
      assert.ok(report.flags.includes('OFAC_SPECIAL_DESIGNATED_NATIONALS'));
    });

    it('dynamically registers custom blacklisted addresses', async () => {
      const engine = new TRMComplianceEngine();
      const customKp = await Keypair.generate();
      const customBlocked = customKp.publicKey.toBase58();
      engine.addSanctionedAddress(customBlocked, ['SUSPICIOUS_PHISHING']);

      const report = await engine.screenAddress(customBlocked);
      assert.equal(report.isCompliant, false);
      assert.ok(report.flags.includes('SUSPICIOUS_PHISHING'));
    });
  });

  describe('Route Planning & Edge Cases', () => {
    it('plans a standard 2-hop route with unique ephemeral keys', async () => {
      const router = new MultiHopperRouter();
      const source = (await Keypair.generate()).publicKey;
      const destination = (await Keypair.generate()).publicKey;
      const amount = 2n * BigInt(LAMPORTS_PER_SOL);

      const plan = await router.planRoute({
        source,
        destination,
        amountLamports: amount,
        hopCount: 2
      });

      assert.equal(plan.hops.length, 2);
      assert.equal(plan.grossAmountLamports, amount);
      assert.notEqual(
        plan.hops[0].ephemeralKeypair.publicKey.toBase58(),
        plan.hops[1].ephemeralKeypair.publicKey.toBase58()
      );
      assert.ok(plan.hops[0].delayMs >= 150);
    });

    it('rejects transfers below minimum safe routing threshold for rent exemption', async () => {
      const router = new MultiHopperRouter();
      const source = (await Keypair.generate()).publicKey;
      const destination = (await Keypair.generate()).publicKey;
      const tinyDust = 1000n; // 1000 lamports is far below rent exemption

      await assert.rejects(
        async () => {
          await router.planRoute({
            source,
            destination,
            amountLamports: tinyDust
          });
        },
        /below minimum safe routing threshold/
      );
    });

    it('fails route planning if destination is on the TRM sanction list', async () => {
      const router = new MultiHopperRouter();
      const source = (await Keypair.generate()).publicKey;
      const sanctionedDest = new PublicKey('11111111111111111111111111111111');

      await assert.rejects(
        async () => {
          await router.planRoute({
            source,
            destination: sanctionedDest,
            amountLamports: 1n * BigInt(LAMPORTS_PER_SOL)
          });
        },
        /TRM Compliance Violation/
      );
    });

    it('clamps hop count within safe range [1, 5]', async () => {
      const router = new MultiHopperRouter();
      const source = (await Keypair.generate()).publicKey;
      const destination = (await Keypair.generate()).publicKey;
      const amount = 5n * BigInt(LAMPORTS_PER_SOL);

      const planOver = await router.planRoute({
        source,
        destination,
        amountLamports: amount,
        hopCount: 10 // exceeds max 5
      });
      assert.equal(planOver.hops.length, 5);

      const planUnder = await router.planRoute({
        source,
        destination,
        amountLamports: amount,
        hopCount: 0 // below min 1
      });
      assert.equal(planUnder.hops.length, 1);
    });
  });

  describe('Transaction Generation & Simulated Execution', () => {
    it('constructs well-formed Solana transactions for each hop', async () => {
      const router = new MultiHopperRouter();
      const payer = await Keypair.generate();
      const destination = (await Keypair.generate()).publicKey;
      const amount = 3n * BigInt(LAMPORTS_PER_SOL);

      const plan = await router.planRoute({
        source: payer.publicKey,
        destination,
        amountLamports: amount,
        hopCount: 2
      });

      const txs = await router.buildTransactions(plan, payer);
      // Tx 0 (funding + fees) + Tx 1 (hop 1 -> hop 2) + Tx 2 (hop 2 -> dest) = 3 transactions
      assert.equal(txs.length, 3);
      assert.ok(txs[0].signatures.length > 0);
    });

    it('simulates end-to-end execution and updates volume tracker', async () => {
      const volumeTracker = new VolumeTracker();
      const router = new MultiHopperRouter({ volumeTracker });
      const payer = await Keypair.generate();
      const destination = (await Keypair.generate()).publicKey;
      const amount = 10n * BigInt(LAMPORTS_PER_SOL);

      const plan = await router.planRoute({
        source: payer.publicKey,
        destination,
        amountLamports: amount,
        hopCount: 2
      });

      const result = await router.executeRoute(plan, payer, true);

      assert.equal(result.success, true);
      assert.equal(result.hopResults.length, 2);
      assert.equal(result.totalLamportsRouted, amount);
      assert.equal(result.builderYieldLamports, 25_000_000n);

      const summary = volumeTracker.getSummary(200); // $200 / SOL
      assert.equal(summary.totalTransfers, 1);
      assert.equal(summary.totalGrossVolumeSOL, 10);
      assert.equal(summary.totalVolumeUsd, 2000);
      assert.equal(summary.qualifiesForBounty, false); // $2,000 < $100,000 threshold
    });

    it('marks qualification true when volume surpasses $100,000 threshold', () => {
      const tracker = new VolumeTracker();
      // Record 600 SOL at $200 = $120,000
      tracker.recordTransfer({
        timestamp: Date.now(),
        routeId: 'route-large',
        grossVolumeLamports: 600n * BigInt(LAMPORTS_PER_SOL),
        builderFeeLamports: 1500000000n,
        protocolFeeLamports: 1500000000n
      });

      const summary = tracker.getSummary(200);
      assert.equal(summary.totalGrossVolumeSOL, 600);
      assert.equal(summary.totalVolumeUsd, 120000);
      assert.equal(summary.qualifiesForBounty, true);
    });
  });

  describe('Multi-Send Unbundling', () => {
    it('creates an unbundled multi-send plan with accurate gross and fee tallies', async () => {
      const router = new MultiHopperRouter();
      const source = (await Keypair.generate()).publicKey;
      const rec1 = (await Keypair.generate()).publicKey;
      const rec2 = (await Keypair.generate()).publicKey;

      const plan = await router.planMultiSend(source, [
        { destination: rec1, amountLamports: 2n * BigInt(LAMPORTS_PER_SOL) },
        { destination: rec2, amountLamports: 3n * BigInt(LAMPORTS_PER_SOL) }
      ]);

      assert.equal(plan.grossAmountLamports, 5n * BigInt(LAMPORTS_PER_SOL));
      assert.equal(plan.totalFeeLamports, 25_000_000n); // 0.50% of 5 SOL
      assert.equal(plan.recipients.length, 2);
      assert.equal(plan.routes.length, 2);
    });

    it('builds transactions and executes multi-send simulation with distinct ephemeral hops', async () => {
      const router = new MultiHopperRouter();
      const payer = await Keypair.generate();
      const rec1 = (await Keypair.generate()).publicKey;
      const rec2 = (await Keypair.generate()).publicKey;

      const plan = await router.planMultiSend(payer.publicKey, [
        { destination: rec1, amountLamports: 1n * BigInt(LAMPORTS_PER_SOL) },
        { destination: rec2, amountLamports: 2n * BigInt(LAMPORTS_PER_SOL) }
      ]);

      const txGroups = await router.buildMultiSendTransactions(plan, payer);
      assert.equal(txGroups.length, 2);

      const execResult = await router.executeMultiSend(plan, payer, true);
      assert.equal(execResult.success, true);
      assert.equal(execResult.routeResults.length, 2);
      assert.equal(execResult.totalLamportsRouted, 3n * BigInt(LAMPORTS_PER_SOL));
      assert.equal(execResult.totalBuilderYieldLamports, 7_500_000n);
    });
  });

  describe('Edge Cases and Treasury Overrides', () => {
    it('verifies exact sequential forward amount conservation across 3 hops', async () => {
      const router = new MultiHopperRouter();
      const source = (await Keypair.generate()).publicKey;
      const destination = (await Keypair.generate()).publicKey;
      const gross = 10n * BigInt(LAMPORTS_PER_SOL);

      const plan = await router.planRoute({
        source,
        destination,
        amountLamports: gross,
        hopCount: 3
      });

      assert.equal(plan.hops.length, 3);
      // Net transfer after 0.5% fee on 10 SOL is 9.95 SOL (9,950,000,000 lamports)
      const net = 9_950_000_000n;
      assert.equal(plan.netTransferLamports, net);
      // Hop 1 forwards net + 2 * 5000 = 9,950,010,000
      assert.equal(plan.hops[0].amountLamports, net + 10000n);
      // Hop 2 forwards net + 1 * 5000 = 9,950,005,000
      assert.equal(plan.hops[1].amountLamports, net + 5000n);
      // Hop 3 (final) forwards net = 9,950,000,000
      assert.equal(plan.hops[2].amountLamports, net);
    });

    it('plans and builds transactions at exact boundary threshold across 5 hops', async () => {
      const router = new MultiHopperRouter();
      const payer = await Keypair.generate();
      const destination = (await Keypair.generate()).publicKey;
      const hopCount = 5;
      const minRequired = (MultiHopperRouter.MIN_RENT_EXEMPT_LAMPORTS + MultiHopperRouter.TX_FEE_LAMPORTS) * BigInt(hopCount + 1);
      const boundaryAmount = minRequired + 1n;

      const plan = await router.planRoute({
        source: payer.publicKey,
        destination,
        amountLamports: boundaryAmount,
        hopCount
      });

      assert.equal(plan.hops.length, 5);
      const txs = await router.buildTransactions(plan, payer);
      // 1 initial funding tx + 5 hop txs = 6 transactions
      assert.equal(txs.length, 6);

      const result = await router.executeRoute(plan, payer, true);
      assert.equal(result.success, true);
    });

    it('applies custom builder and protocol treasury overrides', async () => {
      const router = new MultiHopperRouter();
      const source = (await Keypair.generate()).publicKey;
      const destination = (await Keypair.generate()).publicKey;
      const customBuilder = (await Keypair.generate()).publicKey;
      const customProtocol = (await Keypair.generate()).publicKey;

      const plan = await router.planRoute({
        source,
        destination,
        amountLamports: 5n * BigInt(LAMPORTS_PER_SOL),
        builderTreasury: customBuilder,
        protocolTreasury: customProtocol
      });

      assert.equal(plan.builderTreasury.toBase58(), customBuilder.toBase58());
      assert.equal(plan.protocolTreasury.toBase58(), customProtocol.toBase58());
    });
  });
});
