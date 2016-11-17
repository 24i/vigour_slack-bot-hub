'use strict'

const Hub = require('brisky-hub')
const RtmClient = require('@slack/client').RtmClient
const cEvents = require('@slack/client').CLIENT_EVENTS
const rEvents = require('@slack/client').RTM_EVENTS

module.exports = (token, port) => {
  const hub = new Hub({})

  const rtm = new RtmClient(token)

  var channels = []

  rtm.on(cEvents.RTM.AUTHENTICATED, function (rtmStartData) {
    hub.set({ port, id: rtm.activeUserId })
    channels = rtmStartData.channels.filter(channel => channel.is_member)
  })

  rtm.start()

  rtm.on(cEvents.RTM.RTM_CONNECTION_OPENED, () => {
    hub.emit('info', 'Connected to Slack RTM')

    hub.set({
      outgoing: {
        child: {
          on: {
            data (val) {
              if (!val) { return }

              const message = this

              var to = message.to.compute()

              if (to.substring(0, 1) === '#') {
                const cname = to.substring(1)
                const channel = channels.find(c => c.name === cname)

                if (!channel) {
                  hub.emit('error', `Not a member of ${to}`)
                  return message.remove()
                }

                to = channel.id
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
    if (message.text.indexOf(`<@${rtm.activeUserId}>`) > -1) {
      hub.set({ incoming: {
        [ message.ts ]: message
      } })
    }
  })

  return hub
}
