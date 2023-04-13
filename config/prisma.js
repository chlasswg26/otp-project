require('dotenv').config()
const { NODE_ENV } = process.env
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient(NODE_ENV === 'development' && { log: ['query', 'info'] })

prisma.$on('beforeExit', () => {
  if (NODE_ENV === 'development') console.log('Close connection')
})

module.exports = prisma
