/**
 * Letter Delivery Scheduler
 * Runs every 60 seconds. Finds letters whose deliver_at has passed
 * but haven't been emitted yet (no notified_at), and fires socket events.
 *
 * This survives server restarts — no more lost setTimeout timers.
 */
import { PrismaClient } from '@prisma/client';
import { Server as SocketServer } from 'socket.io';

const prisma = new PrismaClient();

let io: SocketServer | null = null;

export function initScheduler(socketIo: SocketServer) {
  io = socketIo;
  console.log('[scheduler] Letter delivery scheduler initialized — running every 60s');

  // Run immediately on boot to catch any letters missed while server was down
  deliverPendingLetters();

  // Then run every 60 seconds
  setInterval(deliverPendingLetters, 60_000);
}

async function deliverPendingLetters() {
  if (!io) return;

  try {
    const now = new Date();

    // Find letters that:
    // 1. Are scheduled (deliver_at <= now)
    // 2. Have NOT been notified yet (notified_at is null)
    // 3. Are not archived
    const dueLetters = await (prisma as any).letter.findMany({
      where: {
        deliver_at:   { lte: now },
        notified_at:  null,
        is_archived:  false,
      },
      include: {
        sender:   { select: { id: true, cosmic_id: true, display_name: true } },
        receiver: { select: { id: true, cosmic_id: true, display_name: true } },
      },
    });

    if (dueLetters.length === 0) return;
    console.log(`[scheduler] Delivering ${dueLetters.length} pending letter(s)`);

    for (const letter of dueLetters) {
      const payload = {
        ...letter,
        from:         letter.sender.display_name,
        fromCosmicId: letter.sender.cosmic_id,
        letterId:     letter.id,
      };

      // Emit to recipient's room
      io.to(letter.recipient_id).emit('new_letter', payload);

      // Mark as notified so we don't send it again
      await (prisma as any).letter.update({
        where: { id: letter.id },
        data:  { notified_at: now },
      });

      console.log(`[scheduler] Delivered letter ${letter.id} to user ${letter.recipient_id}`);
    }
  } catch (err: any) {
    console.error('[scheduler] Error delivering letters:', err.message);
  }
}
