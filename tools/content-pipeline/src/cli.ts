import { runValidate } from './validate.js';

/**
 * Content pipeline entrypoint.
 * Owner: Vedika G.
 */

const [command, ...rest] = process.argv.slice(2);

if ((command ?? 'validate') === 'validate') {
  const report = runValidate(rest.length > 0 ? rest : undefined);
  for (const message of report.messages) {
    process.stderr.write(`${message}\n`);
  }
  if (report.ok) {
    process.stdout.write(`ok ${String(report.itemCount)} item(s) validated\n`);
    process.exit(0);
  }
  process.stderr.write('validation failed\n');
  process.exit(1);
}

process.stderr.write(`Unknown command ${command}. Try: validate\n`);
process.exit(1);
