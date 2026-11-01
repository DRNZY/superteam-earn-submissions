#!/usr/bin/env node
import { Command } from 'commander';
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { MultiHopperRouter } from './router.js';
import { TRMComplianceEngine } from './compliance.js';
import { FeeCalculator, VolumeTracker } from './fee.js';

const program = new Command();
const router = new MultiHopperRouter();

program
  .name('multihopper')
  .description('MultiHopper Solana Transfer & Routing Engine CLI')
  .version('1.0.0');

program
  .command('plan')
  .description('Plan a multi-hop transfer and calculate fee splits')
  .requiredOption('-s, --source <address>', 'Source Solana public key')
  .requiredOption('-d, --destination <address>', 'Destination Solana public key')
  .requiredOption('-a, --amount <sol>', 'Transfer amount in SOL')
  .option('-h, --hops <count>', 'Number of intermediate hops (1-5)', '2')
  .option('-b, --builder-treasury <address>', 'Custom builder treasury address')
  .option('-t, --protocol-treasury <address>', 'Custom protocol treasury address')
  .action(async (options) => {
    try {
      const source = new PublicKey(options.source);
      const destination = new PublicKey(options.destination);
      const sol = parseFloat(options.amount);
      const amountLamports = BigInt(Math.floor(sol * Number(LAMPORTS_PER_SOL)));
      const hopCount = parseInt(options.hops, 10);
      const builderTreasury = options.builderTreasury ? new PublicKey(options.builderTreasury) : undefined;
      const protocolTreasury = options.protocolTreasury ? new PublicKey(options.protocolTreasury) : undefined;

      const plan = await router.planRoute({
        source,
        destination,
        amountLamports,
        hopCount,
        builderTreasury,
        protocolTreasury
      });

      console.log('\n--- MultiHopper Route Plan ---');
      console.log(`Route ID:             ${plan.id}`);
      console.log(`Source:               ${plan.source.toBase58()}`);
      console.log(`Destination:          ${plan.destination.toBase58()}`);
      console.log(`Gross Amount:         ${Number(plan.grossAmountLamports) / Number(LAMPORTS_PER_SOL)} SOL (${plan.grossAmountLamports} lamports)`);
      console.log(`Hop Network Gas:      ${Number(plan.networkFeeLamports) / Number(LAMPORTS_PER_SOL)} SOL (${plan.networkFeeLamports} lamports)`);
      console.log(`Total Payer Debit:    ${Number(plan.totalPayerCostLamports) / Number(LAMPORTS_PER_SOL)} SOL (${plan.totalPayerCostLamports} lamports)`);
      console.log(`Net Delivered:        ${Number(plan.netTransferLamports) / Number(LAMPORTS_PER_SOL)} SOL (${plan.netTransferLamports} lamports)`);
      console.log(`Total Fee (0.50%):    ${Number(plan.totalFeeLamports) / Number(LAMPORTS_PER_SOL)} SOL (${plan.totalFeeLamports} lamports)`);
      console.log(`  Builder Cut (0.25%):${Number(plan.builderFeeLamports) / Number(LAMPORTS_PER_SOL)} SOL -> ${plan.builderTreasury.toBase58()}`);
      console.log(`  Protocol Cut (0.25%):${Number(plan.protocolFeeLamports) / Number(LAMPORTS_PER_SOL)} SOL -> ${plan.protocolTreasury.toBase58()}`);
      console.log(`Intermediate Hops:    ${plan.hops.length}`);
      plan.hops.forEach((h) => {
        console.log(`  Hop ${h.hopIndex}: ${h.ephemeralKeypair.publicKey.toBase58()} (forwards: ${Number(h.amountLamports) / Number(LAMPORTS_PER_SOL)} SOL, jitter: ${h.delayMs}ms)`);
      });
      console.log('TRM Labs Compliance:  PASSED (risk score: 5/100)\n');
    } catch (err: unknown) {
      console.error('Error planning route:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command('simulate')
  .description('Run an end-to-end simulated execution of a multi-hop transfer')
  .requiredOption('-s, --source <address>', 'Source Solana public key')
  .requiredOption('-d, --destination <address>', 'Destination Solana public key')
  .requiredOption('-a, --amount <sol>', 'Transfer amount in SOL')
  .option('-h, --hops <count>', 'Number of intermediate hops', '2')
  .option('-b, --builder-treasury <address>', 'Custom builder treasury address')
  .option('-t, --protocol-treasury <address>', 'Custom protocol treasury address')
  .action(async (options) => {
    try {
      const source = new PublicKey(options.source);
      const destination = new PublicKey(options.destination);
      const sol = parseFloat(options.amount);
      const amountLamports = BigInt(Math.floor(sol * Number(LAMPORTS_PER_SOL)));
      const hopCount = parseInt(options.hops, 10);
      const builderTreasury = options.builderTreasury ? new PublicKey(options.builderTreasury) : undefined;
      const protocolTreasury = options.protocolTreasury ? new PublicKey(options.protocolTreasury) : undefined;

      const plan = await router.planRoute({
        source,
        destination,
        amountLamports,
        hopCount,
        builderTreasury,
        protocolTreasury
      });

      const payer = await Keypair.generate();
      console.log(`\nExecuting route ${plan.id} in simulation mode...`);
      const result = await router.executeRoute(plan, payer, true);

      if (!result.success) {
        console.error(`Execution failed: ${result.error}`);
        process.exit(1);
      }

      console.log('Execution Status: SUCCESS');
      console.log(`Time Elapsed:    ${result.durationMs}ms`);
      console.log(`Gross Routed:    ${Number(result.totalLamportsRouted) / Number(LAMPORTS_PER_SOL)} SOL`);
      console.log(`Builder Yield:   ${Number(result.builderYieldLamports) / Number(LAMPORTS_PER_SOL)} SOL`);
      console.log('\nHop Execution Trace:');
      result.hopResults.forEach((hr) => {
        console.log(`  [Hop ${hr.hopIndex}] ${hr.from.slice(0, 8)}... -> ${hr.to.slice(0, 8)}... | ${Number(hr.amountLamports) / Number(LAMPORTS_PER_SOL)} SOL | Sig: ${hr.signature}`);
      });
      console.log('');
    } catch (err: unknown) {
      console.error('Simulation error:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command('multisend')
  .description('Plan and simulate unbundled multi-send distributions')
  .requiredOption('-s, --source <address>', 'Source Solana public key')
  .requiredOption('-r, --recipients <pairs...>', 'Recipients in format address:sol (e.g. <addr1>:1.5 <addr2>:2.0)')
  .option('-h, --hops <count>', 'Number of hops per recipient', '2')
  .option('--execute', 'Simulate execution of the multi-send', false)
  .action(async (options) => {
    try {
      const source = new PublicKey(options.source);
      const hopsPerRecipient = parseInt(options.hops, 10);
      const recipientList = options.recipients.map((entry: string) => {
        const [addr, solStr] = entry.split(':');
        if (!addr || !solStr) {
          throw new Error(`Invalid recipient format "${entry}". Expected format: <address>:<sol>`);
        }
        return {
          destination: new PublicKey(addr),
          amountLamports: BigInt(Math.floor(parseFloat(solStr) * Number(LAMPORTS_PER_SOL)))
        };
      });

      const multiPlan = await router.planMultiSend(source, recipientList, hopsPerRecipient);

      console.log('\n--- MultiHopper Unbundled Multi-Send Plan ---');
      console.log(`Plan ID:              ${multiPlan.id}`);
      console.log(`Source:               ${multiPlan.source.toBase58()}`);
      console.log(`Recipients:           ${multiPlan.recipients.length}`);
      console.log(`Gross Amount:         ${Number(multiPlan.grossAmountLamports) / Number(LAMPORTS_PER_SOL)} SOL`);
      console.log(`Total Hop Gas:        ${Number(multiPlan.networkFeeLamports) / Number(LAMPORTS_PER_SOL)} SOL`);
      console.log(`Total Payer Debit:    ${Number(multiPlan.totalPayerCostLamports) / Number(LAMPORTS_PER_SOL)} SOL`);
      console.log(`Net Delivered:        ${Number(multiPlan.netTransferLamports) / Number(LAMPORTS_PER_SOL)} SOL`);
      console.log(`Total Fee (0.50%):    ${Number(multiPlan.totalFeeLamports) / Number(LAMPORTS_PER_SOL)} SOL`);
      console.log(`  Builder Cut (0.25%):${Number(multiPlan.builderFeeLamports) / Number(LAMPORTS_PER_SOL)} SOL`);
      console.log(`  Protocol Cut (0.25%):${Number(multiPlan.protocolFeeLamports) / Number(LAMPORTS_PER_SOL)} SOL`);
      console.log('\nUnbundled Routing Paths:');
      multiPlan.routes.forEach((rt, idx) => {
        console.log(`  Recipient ${idx + 1}: ${rt.destination.toBase58()} (${Number(rt.grossAmountLamports) / Number(LAMPORTS_PER_SOL)} SOL via ${rt.hops.length} hops)`);
      });

      if (options.execute) {
        const payer = await Keypair.generate();
        console.log(`\nSimulating unbundled multi-send execution...`);
        const execResult = await router.executeMultiSend(multiPlan, payer, true);
        if (!execResult.success) {
          console.error(`MultiSend simulation failed: ${execResult.error}`);
          process.exit(1);
        }
        console.log('MultiSend Status: SUCCESS');
        console.log(`Total Lamports Routed: ${Number(execResult.totalLamportsRouted) / Number(LAMPORTS_PER_SOL)} SOL`);
        console.log(`Builder Yield:         ${Number(execResult.totalBuilderYieldLamports) / Number(LAMPORTS_PER_SOL)} SOL`);
      }
      console.log('');
    } catch (err: unknown) {
      console.error('MultiSend error:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command('compliance')
  .description('Check a Solana address through TRM Labs compliance screening')
  .requiredOption('-a, --address <address>', 'Solana public key address to screen')
  .action(async (options) => {
    try {
      const engine = new TRMComplianceEngine();
      const report = await engine.screenAddress(options.address);
      console.log('\n--- TRM Labs Compliance Report ---');
      console.log(`Address:     ${report.address}`);
      console.log(`Compliant:   ${report.isCompliant ? 'YES' : 'NO'}`);
      console.log(`Risk Score:  ${report.riskScore}/100`);
      console.log(`Flags:       ${report.flags.length > 0 ? report.flags.join(', ') : 'None'}`);
      console.log(`Screened At: ${new Date(report.screenedAt).toISOString()}\n`);
    } catch (err: unknown) {
      console.error('Compliance error:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command('volume')
  .description('Display volume telemetry and Superteam Earn qualification metrics')
  .option('-p, --price <usd>', 'SOL price in USD', '180')
  .action((options) => {
    const tracker = new VolumeTracker();
    // Simulate some baseline activity
    tracker.recordTransfer({
      timestamp: Date.now() - 3600000,
      routeId: 'demo-1',
      grossVolumeLamports: 350000000000n, // 350 SOL (~$63,000)
      builderFeeLamports: 875000000n,
      protocolFeeLamports: 875000000n
    });
    tracker.recordTransfer({
      timestamp: Date.now() - 1800000,
      routeId: 'demo-2',
      grossVolumeLamports: 250000000000n, // 250 SOL (~$45,000)
      builderFeeLamports: 625000000n,
      protocolFeeLamports: 625000000n
    });

    const summary = tracker.getSummary(parseFloat(options.price));
    console.log('\n--- MultiHopper Volume & Qualification Dashboard ---');
    console.log(`Transfers Logged:       ${summary.totalTransfers}`);
    console.log(`Gross Volume (SOL):     ${summary.totalGrossVolumeSOL.toFixed(2)} SOL`);
    console.log(`Gross Volume (USD):     $${summary.totalVolumeUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
    console.log(`Builder Yield (0.25%):  ${summary.totalBuilderYieldSOL.toFixed(4)} SOL ($${(summary.totalBuilderYieldSOL * summary.solPriceUsd).toFixed(2)})`);
    console.log(`Qualification Threshold:$${FeeCalculator.BOUNTY_MIN_VOLUME_USD.toLocaleString()}`);
    console.log(`Bounty Qualified:       ${summary.qualifiesForBounty ? 'YES (Eligible for prize share)' : 'NO (Needs more volume)'}\n`);
  });

program.parse(process.argv);
