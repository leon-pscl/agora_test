import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const API_ROUTES = [
  { path: 'app/api/generate-agora-token/route.ts', methods: ['GET'] },
  { path: 'app/api/invite-agent/route.ts', methods: ['POST'] },
  { path: 'app/api/stop-conversation/route.ts', methods: ['POST'] },
  { path: 'app/api/update-agent/route.ts', methods: ['POST'] },
  { path: 'app/api/webhooks/route.ts', methods: ['POST'] },
  { path: 'app/api/bookings/route.ts', methods: ['GET', 'POST', 'PATCH'] },
  { path: 'app/api/transcripts/route.ts', methods: ['GET', 'POST'] },
  { path: 'app/api/diagnostics/route.ts', methods: ['GET'] },
  { path: 'app/api/schedules/route.ts', methods: ['GET', 'POST', 'PATCH', 'DELETE'] },
  { path: 'app/api/landlords/[landlord_id]/route.ts', methods: ['GET', 'PUT', 'DELETE'] },
];

const root = join(import.meta.dirname, '..');

let allPassed = true;
let totalExports = 0;

for (const route of API_ROUTES) {
  const fullPath = join(root, route.path);

  if (!existsSync(fullPath)) {
    console.error(`✗ MISSING: ${route.path}`);
    allPassed = false;
    continue;
  }

  const content = readFileSync(fullPath, 'utf-8');
  const exported: string[] = [];

  for (const method of route.methods) {
    const regex = new RegExp(`export\\s+(async\\s+)?function\\s+${method}\\b`);
    const namedExport = regex.test(content);
    const constExport = new RegExp(`export\\s+(const|let|var)\\s+${method}\\s*[=:]`).test(content);
    if (namedExport || constExport) {
      exported.push(method);
      totalExports++;
    } else {
      console.error(`✗ ${route.path}: missing export for ${method}()`);
      allPassed = false;
    }
  }

  if (exported.length > 0) {
    console.log(`✓ ${route.path} — ${exported.join(', ')}`);
  }
}

const label = allPassed ? 'PASS' : 'FAIL';
console.log(`\n[${label}] ${totalExports} route exports verified across ${API_ROUTES.length} routes.`);
process.exit(allPassed ? 0 : 1);
