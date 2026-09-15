import { describe, expect, it } from 'vitest'
import { encodeMentions, matchesMention, mentionQuery, mentionsUser, parseComment } from './mentions'

const MARCO = '22222222-2222-4222-8222-222222222222'
const ANNA = '33333333-3333-4333-8333-333333333333'

describe('comment mentions', () => {
  it('splits a comment into text, members and @all', () => {
    expect(parseComment(`Ciao <@${MARCO}>, e voi?@all no, @all sì. vera@all.it`)).toEqual([
      { type: 'text', text: 'Ciao ' },
      { type: 'user', userId: MARCO },
      { type: 'text', text: ', e voi?' },
      { type: 'all' },
      { type: 'text', text: ' no, ' },
      { type: 'all' },
      { type: 'text', text: ' sì. vera@all.it' },
    ])
    expect(parseComment('niente tag')).toEqual([{ type: 'text', text: 'niente tag' }])
  })

  it('knows who a comment is addressed to', () => {
    expect(mentionsUser(`<@${MARCO}> guarda`, MARCO)).toBe(true)
    expect(mentionsUser(`<@${MARCO}> guarda`, ANNA)).toBe(false)
    expect(mentionsUser('@ALL si parte', ANNA)).toBe(true)
    expect(mentionsUser('mail@allegra.it', ANNA)).toBe(false)
  })

  it('turns picked names into tokens, longest first, leaving edited ones as text', () => {
    const picked = [
      { id: MARCO, label: 'Anna' },
      { id: ANNA, label: 'Anna Maria' },
    ]
    expect(encodeMentions('@Anna Maria e @Anna, @Annalisa?', picked)).toBe(`<@${ANNA}> e <@${MARCO}>, @Annalisa?`)
  })

  it('finds the name being typed before the caret', () => {
    expect(mentionQuery('ciao @ma', 8)).toEqual({ start: 5, end: 8, text: 'ma' })
    expect(mentionQuery('@', 1)).toEqual({ start: 0, end: 1, text: '' })
    expect(mentionQuery('mail@ma', 7)).toBeNull()
    expect(mentionQuery('@marco ciao', 11)).toBeNull()
    expect(matchesMention('Anna Maria', 'ma')).toBe(true)
    expect(matchesMention('Sára Conti', 'sa')).toBe(true)
    expect(matchesMention('Luca', 'ma')).toBe(false)
  })
})
