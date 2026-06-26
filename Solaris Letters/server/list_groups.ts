import { prisma } from './db';

async function run() {
  try {
    const groups = await prisma.group.findMany({
      include: {
        members: {
          include: { user: true }
        }
      }
    });
    console.log('GROUPS IN DB:');
    for (const g of groups) {
      console.log(`Group ID: ${g.id}`);
      console.log(`Name: ${g.name}`);
      console.log(`Created By: ${g.created_by}`);
      console.log('Members:');
      for (const m of g.members) {
        console.log(`  - User ID: ${m.user.id}, Cosmic ID: ${m.user.cosmic_id}, Role: ${m.role}`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
