/* One page, one voice.

   There are five clips on this page that can carry sound — the premise film,
   the hero's event terminal, and the two world-state channels — and any two of
   them playing at once is neither of them. So audio is a claim rather than a
   property: a clip that starts speaking takes the sound off whatever had it,
   and every other clip is told to go quiet in its own terms (each owner keeps
   its own button state, so muting has to run through the owner rather than
   being done to the element behind its back).

   Registration is by element, so re-registering the same video replaces its
   entry instead of stacking a second muter on it. */

const owners = new Map();

export function registerAudio(video, mute) {
  if (video) owners.set(video, mute);
}

/* `video` keeps the sound; everything else gives it up. Call this from inside
   whatever already decided to unmute, not before it. */
export function claimAudio(video) {
  for (const [el, mute] of owners) if (el !== video) mute();
}
