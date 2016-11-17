'use strict'

const test = require('tape')
const sinon = require('sinon')
const Hub = require('brisky-hub')
const slack = require('@slack/client')

const bot = require('../lib')

test('send message to channel', t => {
  const on = sinon.stub(slack.RtmClient.prototype, 'on')
  const start = sinon.stub(slack.RtmClient.prototype, 'start')
  const sendMessage = sinon.stub(slack.RtmClient.prototype, 'sendMessage')

  on
    .withArgs(slack.CLIENT_EVENTS.RTM.AUTHENTICATED)
    .callsArgWith(1, { channels: [ { id: 'channel-id', name: 'channel', is_member: true } ] })

  on
    .withArgs(slack.CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED)
    .callsArg(1)

  sendMessage
    .withArgs('message body', 'channel-id')
    .returns(Promise.resolve())

  const server = bot('TOKEN', 9966)
  const client = new Hub({
    id: 'client',
    url: 'ws://localhost:9966',
    context: false
  })

  t.plan(1)

  client.subscribe({ outgoing: { val: true } }, (val, type) => {
    if (type === 'update') {
      t.ok(sendMessage.getCall(0).calledWith('message body', 'channel-id'), 'sends message to slack API')
      client.remove()
      server.remove()
      on.restore()
      start.restore()
      sendMessage.restore()
    }
  })

  client.set({
    outgoing: {
      first: {
        to: '#channel',
        text: 'message body'
      }
    }
  })
})
