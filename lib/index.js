const {Socket} = require('net');
const {AUTH, EXEC_COMMAND} = require('./constants');
const {createId, createRequest, readResponse} = require('./utils');

const client = new Socket();

const state = {
  connected: false,
};

module.exports = {
  connect: (
    url = '127.0.0.1',
    port = '27020',
    password = '',
  ) => new Promise((resolve, reject) => {
    if (state.connected) {
      return reject('Connection already exists')
    }

    client.on('error', err => {
      client.removeAllListeners()
      return reject(err);
    })

    client.connect(port, url, () => {
      const id = createId();

      client.on('data', (data) => {
        const response = readResponse(data);
  
        if (response.id === id) {
          client.removeAllListeners()
          state.connected = true;
          resolve();
        }
      });

      const auth = createRequest(AUTH, id, password);
      client.write(auth);
    });
  }),

  disconnect: () => new Promise((resolve, reject) => {
    if (!state.connected) {
      return reject('Not connected')
    }

    client.removeAllListeners()
    client.destroy();

    client.on('close', () => {
      state.connected = false;
      client.removeAllListeners()
      resolve();
    });

    client.on('error', err => {
      client.removeAllListeners()
      reject(err);
    })
  }),

  send: command => new Promise((resolve, reject) => {
    if (!state.connected) {
      return reject('Not connected')
    }

    const id = createId();
    const cmd = createRequest(EXEC_COMMAND, id, command);

    client.on('data', (data) => {
      const response = readResponse(data);

      if (response.id === id) {
        client.removeAllListeners()
        resolve(response.body);
      }
    });

    client.on('error', err => {
      client.removeAllListeners()
      reject(err)
    });

    client.write(cmd);
  }),
};
