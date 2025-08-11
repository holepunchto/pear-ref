'use strict'
const test = require('brittle')
const ref = require('..')

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const reset = (teardown) => {
  const start = ref.refs
  teardown(() => {
    while (ref.refs > start) ref.unref()
    while (ref.refs < start) ref.ref()
  })
  return start
}

test('ref increments and emits; unref decrements and emits', (t) => {
  const start = reset(t.teardown)
  t.plan(4)

  ref.once('ref', n => t.is(n, start + 1))
  ref.ref()
  t.is(ref.refs, start + 1)

  ref.once('unref', n => t.is(n, start))
  ref.unref()
  t.is(ref.refs, start)
})

test('track resolves and balances refs', async (t) => {
  const start = reset(t.teardown)

  const p = ref.track(Promise.resolve('ok'))
  t.is(ref.refs, start + 1, 'increment happens immediately')

  const v = await p
  t.is(v, 'ok')
  t.is(ref.refs, start, 'balanced after resolve')
})

test('track rejects and still balances refs', async (t) => {
  const start = reset(t.teardown)

  const err = new Error('boom')
  const p = ref.track(Promise.reject(err))
  t.is(ref.refs, start + 1, 'increment happens immediately')

  try {
    await p
    t.fail('should have thrown')
  } catch (e) {
    t.is(e, err)
  }
  t.is(ref.refs, start, 'balanced after reject')
})

test('concurrent track calls emit paired ref/unref', async (t) => {
  const start = reset(t.teardown)

  let refEvents = 0
  let unrefEvents = 0
  const onRef = () => { refEvents++ }
  const onUnref = () => { unrefEvents++ }
  ref.on('ref', onRef)
  ref.on('unref', onUnref)

  try {
    await Promise.all([
      ref.track(wait(10)),
      ref.track(wait(5))
    ])
  } finally {
    ref.off('ref', onRef)
    ref.off('unref', onUnref)
  }

  t.is(refEvents, 2)
  t.is(unrefEvents, 2)
  t.is(ref.refs, start)
})
