// Tiny WebAudio beeps for scan feedback — no audio assets needed.
// Reuses one AudioContext (browsers cap concurrent contexts).

let ctx = null

function getCtx() {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  if (!ctx) {
    try {
      ctx = new AC()
    } catch {
      return null
    }
  }
  // Contexts start suspended until a user gesture; scans follow key/click
  // events so resume() succeeds silently.
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

function tone(frequency, startAt, duration, volume = 0.08) {
  const ac = getCtx()
  if (!ac) return
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'square'
  osc.frequency.value = frequency
  gain.gain.setValueAtTime(volume, ac.currentTime + startAt)
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + startAt + duration)
  osc.connect(gain).connect(ac.destination)
  osc.start(ac.currentTime + startAt)
  osc.stop(ac.currentTime + startAt + duration + 0.02)
}

/** Short high chirp — successful scan. */
export function beepSuccess() {
  tone(1200, 0, 0.07)
}

/** Two low buzzes — scan failed / not found. */
export function beepError() {
  tone(240, 0, 0.12)
  tone(240, 0.16, 0.12)
}
