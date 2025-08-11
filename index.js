'use strict'
const EventEmitter = require('events')

class Ref extends EventEmitter {
  refs = 0 // read-only
  ref () {
    this.refs++
    this.emit('ref', this.refs)
  }

  async track (promise) {
    this.ref()
    try {
      return await promise
    } finally {
      this.unref()
    }
  }

  unref () {
    this.refs--
    this.emit('unref', this.refs)
  }
}

module.exports = new Ref()
