import { ensureDefaultLandlordSeeded } from '../lib/landlords';

async function main() {
  await ensureDefaultLandlordSeeded();
  console.log('Database seeded with default landlord profile.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
