'use strict'

const test = require('ava')
const uuid = require('uuid-base62')
const r = require('rethinkdb')
const Db = require('../')
const fixtures = require('./fixtures')

test.beforeEach('setup database', async t => {
  const dbName = `platzigram_${uuid.v4()}`
  const db = new Db({ db: dbName })
  await db.connect()
  t.context.db = db
  t.context.dbName = dbName
  t.true(db.connected, 'should be connected')
})

test.afterEach.always('cleanup database', async t => {
  let db = t.context.db
  let dbName = t.context.dbName

  await db.disconnect()
  t.false(db.connected, 'should be disconnected')

  let conn = await r.connect({})
  await r.dbDrop(dbName).run(conn)
})

test('save image', async t => {
  let db = t.context.db
  t.is(typeof db.saveImage, 'function', 'saveImage is function')

  let image = fixtures.getImage()

  let created = await db.saveImage(image)
  t.is(created.description, image.description)
  t.is(created.url, image.url)
  t.is(created.likes, image.likes)
  t.is(created.liked, image.liked)
  t.deepEqual(created.tags, [ 'awesome', 'tags', 'platzi' ])
  t.is(created.user_id, image.user_id)
  t.is(typeof created.id, 'string')
  t.is(created.public_id, uuid.encode(created.id))
  t.truthy(created.createdAt)
})

test('like image', async t => {
  let db = t.context.db
  t.is(typeof db.likeImage, 'function', 'likeImage is a function')

  let image = fixtures.getImage()
  let created = await db.saveImage(image)
  let result = await db.likeImage(created.public_id)

  t.true(result.liked)
  t.is(result.likes, image.likes + 1)
})

test('get image', async t => {
  let db = t.context.db

  t.is(typeof db.getImage, 'function', 'getImage is a function')

  let image = fixtures.getImage()
  let created = await db.saveImage(image)
  let result = await db.getImage(created.public_id)

  t.deepEqual(created, result)
})

test('list all images', async t => {
  let db = t.context.db
  let images = fixtures.getImages(3)
  let saveImages = images.map(img => db.saveImage(img))
  let created = await Promise.all(saveImages)
  let result = await db.getImages()

  t.is(created.length, result.length)
})
