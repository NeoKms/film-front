import { readFile } from 'node:fs/promises';

const roomStore = await readFile(new URL('../stores/room.ts', import.meta.url), 'utf8');
const realtime = await readFile(new URL('../composables/useRoomRealtime.ts', import.meta.url), 'utf8');
const selection = await readFile(new URL('../components/room/started.vue', import.meta.url), 'utf8');

const requiredRoomFragments = [
  '/room/${id}/filters',
  '/room/${id}/start',
  '/room/${id}/end',
  '/room/${id}/films',
  '/room/${id}/films/matched',
  '/room/${roomId}/films/${filmId}/${direction}',
];
const requiredEvents = ['room.join', 'room.joined', 'room.update', 'room.new-match'];

const failures = [];
for (const fragment of requiredRoomFragments) {
  if (!roomStore.includes(fragment)) failures.push(`Missing room contract fragment: ${fragment}`);
}
for (const event of requiredEvents) {
  if (!realtime.includes(event)) failures.push(`Missing realtime event: ${event}`);
}
if (roomStore.includes('patchRoom')) failures.push('Legacy patchRoom API returned');
if (selection.includes('filmStore.getList')) failures.push('Selection must use participant room queue, not the shared film catalog');
if (!selection.includes('film-swipe-card')) failures.push('Selection screen must keep the swipe interaction');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Frontend contract check passed');
}
