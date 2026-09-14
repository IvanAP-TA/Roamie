import { useSyncExternalStore } from 'react'

/** Wheel sound effects synthesised with WebAudio (no audio files, no external requests). */

const KEY = 'roamie.sound'
const EVENT = 'roamie:sound-pref'

function readEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export function setSoundEnabled(enabled: boolean) {
  try {
    localStorage.setItem(KEY, enabled ? 'on' : 'off')
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(EVENT))
}

export function useSoundEnabled(): [boolean, (enabled: boolean) => void] {
  const enabled = useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENT, cb)
      window.addEventListener('storage', cb)
      return () => {
        window.removeEventListener(EVENT, cb)
        window.removeEventListener('storage', cb)
      }
    },
    readEnabled,
    () => true,
  )
  return [enabled, setSoundEnabled]
}

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (!readEnabled()) return null
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/** Call from a user gesture (e.g. the confirm button) so iOS allows playback later. */
export function unlockAudio() {
  audio()
}

function blip(ac: AudioContext, freq: number, start: number, duration: number, volume: number, type: OscillatorType) {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  gain.gain.setValueAtTime(volume, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(gain).connect(ac.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

export function playTick() {
  const ac = audio()
  if (!ac) return
  blip(ac, 1400, ac.currentTime, 0.04, 0.05, 'triangle')
}

export function playWin() {
  const ac = audio()
  if (!ac) return
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((f, i) => blip(ac, f, ac.currentTime + i * 0.09, 0.35, 0.08, 'sine'))
}
