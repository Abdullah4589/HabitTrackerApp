import { createAudioPlayer } from 'expo-audio';

const asset = () => require('../assets/sounds/chime.mp3');

let chimePlayer: ReturnType<typeof createAudioPlayer> | null = null;

export async function playChime(): Promise<void> {
  try {
    if (!chimePlayer) chimePlayer = createAudioPlayer(asset());
    chimePlayer.seekTo(0);
    chimePlayer.play();
  } catch {}
}

// Double chime — all daily habits done
export async function playAllDoneSound(): Promise<void> {
  try {
    const p1 = createAudioPlayer(asset());
    const p2 = createAudioPlayer(asset());
    p1.play();
    setTimeout(() => p2.play(), 280);
  } catch {}
}

// Triple ascending chime — challenge complete
export async function playChallengeSound(): Promise<void> {
  try {
    const p1 = createAudioPlayer(asset());
    const p2 = createAudioPlayer(asset());
    const p3 = createAudioPlayer(asset());
    p1.play();
    setTimeout(() => p2.play(), 220);
    setTimeout(() => p3.play(), 440);
  } catch {}
}
