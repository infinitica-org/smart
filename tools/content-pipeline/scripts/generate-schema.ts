import { writeFileSync } from 'node:fs';
import { z } from 'zod';
import { ItemAuthoringSchema } from '../src/schema.js';

/** Regenerates the editor-facing JSON Schema from the Zod source of truth. */
const jsonSchema = z.toJSONSchema(ItemAuthoringSchema, { target: 'draft-7' });
writeFileSync(
  new URL('../schema/item.schema.json', import.meta.url),
  `${JSON.stringify(jsonSchema, null, 2)}\n`,
);
process.stdout.write('wrote tools/content-pipeline/schema/item.schema.json\n');
