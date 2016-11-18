#!/usr/bin/env node

'use strict'

const hub = require('../lib')

hub(process.argv[2], process.argv[3] || process.env.BOT_TOKEN)
