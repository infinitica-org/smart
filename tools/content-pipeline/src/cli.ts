import { TRACK_DEFINITIONS, assertDomainWeightsSumToOne } from '@smart/contracts';

/**
 * Content pipeline entrypoint.
 * Owner: Vedika G.
 */

const command = process.argv[2] ?? 'validate';

if (command === 'validate') {
  for (const track of TRACK_DEFINITIONS) {
    assertDomainWeightsSumToOne(track);
  }
  process.stdout.write(
    `ok ${String(TRACK_DEFINITIONS.length)} tracks, domain weights sum to 1.0\n`,
  );
  process.exit(0);
}

process.stderr.write(`Unknown command ${command}. Try: validate\n`);
process.exit(1);
