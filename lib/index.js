'use strict'

const Hub = require('brisky-hub')
const RtmClient = require('@slack/client').RtmClient
const cEvents = require('@slack/client').CLIENT_EVENTS
const rEvents = require('@slack/client').RTM_EVENTS

module.exports = (token, port) => {
  if (!port) {
    port = 80
  }

  const hub = new Hub({ channels: {} })
  const rtm = new RtmClient(token)

  rtm.start()

  rtm.on(cEvents.RTM.AUTHENTICATED, function (rtmStartData) {
    hub.set({ port, id: rtm.activeUserId })
    if (!rtmStartData) { rtmStartData = {} }
    rtmStartData.channels = rtmStartData.channels || []
    rtmStartData.channels.forEach(channel => {
      if (channel.is_member) {
        hub.set({
          channels: { [channel.id]: channel.name }
        })
      }
    })
  })

  rtm.on(cEvents.RTM.RTM_CONNECTION_OPENED, () => {
    hub.emit('info', 'Connected to Slack RTM')

    hub.set({
      out: {
        child: {
          on: {
            data (val) {
              if (!val) { return }

              const message = this
              var to = message.to.compute()

              if (to.substring(0, 1) === '#') {
                const cname = to.substring(1)
                const channel = hub.get('channels').each(c => c.compute() === cname ? c.key : false)

                if (!channel) {
                  hub.emit('error', `Not a member of ${to}`)
                  return message.remove()
                }

                to = channel
              }

              rtm.sendMessage(message.text.compute(), to)
                .then(message.remove.bind(message))
                .catch(err => {
                  hub.emit('error', err)
                  message.remove()
                })
            }
          }
        }
      }
    })
  })

  rtm.on(rEvents.MESSAGE, message => {
    if (message && message.text && message.text.indexOf(`<@${rtm.activeUserId}>`) > -1) {
      hub.set({ in: {
        [ message.ts ]: message
      } })
    }
  })

  rtm.on(rEvents.CHANNEL_JOINED, event => {
    hub.set({
      channels: { [event.channel.id]: event.channel.name }
    })
  })

  rtm.on(rEvents.CHANNEL_LEFT, event => {
    const found = hub.get(['channels', event.channel])
    if (found) {
      found.remove()
    }
  })

  return hub
}
