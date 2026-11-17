const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { io: ioClient } = require('socket.io-client');
const { createServer } = require('../src/app');
const { loadConfig } = require('../src/config');

let mongo; let server; let url; let config;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  config = loadConfig({ mongoUri: mongo.getUri(), jwtSecret: 'x'.repeat(40), allowedOrigins: [] });
  await mongoose.connect(config.mongoUri);
  ({ server } = createServer(config));
  await new Promise((r) => server.listen(0, r));
  url = `http://localhost:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((r) => server.close(r));
  await mongoose.disconnect();
  await mongo.stop();
});

const connect = (token) => new Promise((resolve, reject) => {
  const s = ioClient(url, { auth: { token }, transports: ['websocket'], forceNew: true });
  s.on('connect', () => resolve(s));
  s.on('connect_error', (e) => { s.close(); reject(e); });
});

test('register then log in with the same password (no double hashing)', async () => {
  const reg = await request(url).post('/api/auth/register').send({ username: 'rudra', password: 'password123' });
  expect(reg.status).toBe(201);
  const login = await request(url).post('/api/auth/login').send({ username: 'rudra', password: 'password123' });
  expect(login.status).toBe(200);
  expect(login.body.token).toBeTruthy();
});

test('wrong password and duplicate username are rejected', async () => {
  const bad = await request(url).post('/api/auth/login').send({ username: 'rudra', password: 'wrongpass1' });
  expect(bad.status).toBe(401);
  const dup = await request(url).post('/api/auth/register').send({ username: 'rudra', password: 'password123' });
  expect(dup.status).toBe(409);
});

test('short passwords are rejected', async () => {
  const res = await request(url).post('/api/auth/register').send({ username: 'shorty', password: '123' });
  expect(res.status).toBe(400);
});

test('chat refuses connections without a valid token', async () => {
  await expect(connect(undefined)).rejects.toThrow(/log/i);
  await expect(connect('fake.token.here')).rejects.toThrow(/log in/i);
});

test('logged-in users can chat and new users receive history', async () => {
  const { body } = await request(url).post('/api/auth/login').send({ username: 'rudra', password: 'password123' });
  const a = await connect(body.token);
  const received = new Promise((r) => a.on('chat message', r));
  a.emit('chat message', '  hello world  ');
  const msg = await received;
  expect(msg).toMatchObject({ username: 'rudra', text: 'hello world' });

  const reg = await request(url).post('/api/auth/register').send({ username: 'friend', password: 'password123' });
  const history = new Promise((resolve, reject) => {
    const b = ioClient(url, { auth: { token: reg.body.token }, transports: ['websocket'], forceNew: true });
    b.on('chat history', (h) => { b.close(); resolve(h); });
    b.on('connect_error', reject);
  });
  expect((await history).map((m) => m.text)).toContain('hello world');
  a.close();
});

test('config refuses to start without a strong secret', () => {
  expect(() => loadConfig({ mongoUri: 'mongodb://x', jwtSecret: 'short' })).toThrow(/JWT_SECRET/);
});
