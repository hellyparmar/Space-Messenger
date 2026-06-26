import { prisma } from './db';

async function run() {
  const groupId = '5a24a840-75ae-4c7a-abba-18c55b0a7e8f';
  try {
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });
    console.log('GROUP:', group);
    if (!group) return;

    await prisma.$transaction([
      prisma.groupMessage.deleteMany({ where: { group_id: groupId } }),
      prisma.groupMember.deleteMany({ where: { group_id: groupId } }),
      prisma.group.delete({ where: { id: groupId } }),
    ]);
    console.log('DELETE TRANSACTION SUCCESSFUL!');
  } catch (err) {
    console.error('DELETE TRANSACTION FAILED:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
