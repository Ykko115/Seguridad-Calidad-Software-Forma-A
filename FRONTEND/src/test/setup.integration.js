// Setup para pruebas de INTEGRACIÓN (plan EP1, 3.2.4).
// Reutiliza el setup base y añade los globales fetch de Node (undici) que
// MSW necesita en el entorno jsdom (Request/Response/Headers/fetch).
// NO se pisan FormData/Blob/File: se conservan los de jsdom para que los
// formularios y la subida multipart funcionen con los tipos del DOM.
require('./setup.js');

// Los streams deben existir ANTES de requerir undici (los usa a nivel módulo).
const {
  ReadableStream,
  WritableStream,
  TransformStream,
} = require('node:stream/web');

if (typeof globalThis.ReadableStream === 'undefined') {
  globalThis.ReadableStream = ReadableStream;
}
if (typeof globalThis.WritableStream === 'undefined') {
  globalThis.WritableStream = WritableStream;
}
if (typeof globalThis.TransformStream === 'undefined') {
  globalThis.TransformStream = TransformStream;
}

const { MessageChannel, MessagePort, BroadcastChannel } = require('node:worker_threads');

if (typeof globalThis.MessageChannel === 'undefined') {
  globalThis.MessageChannel = MessageChannel;
}
if (typeof globalThis.MessagePort === 'undefined') {
  globalThis.MessagePort = MessagePort;
}
if (typeof globalThis.BroadcastChannel === 'undefined') {
  globalThis.BroadcastChannel = BroadcastChannel;
}

// Silencia los avisos `act(...)` de temporizadores internos de MUI
// (TouchRipple, Transition, Modal): son ruido del entorno jsdom, no
// errores de la aplicación. El resto de console.error se mantiene.
const originalConsoleError = console.error.bind(console);
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('was not wrapped in act')
  ) {
    return;
  }
  originalConsoleError(...args);
};

const { fetch, Request, Response, Headers } = require('undici');

if (typeof globalThis.Request === 'undefined') globalThis.Request = Request;
if (typeof globalThis.Response === 'undefined') globalThis.Response = Response;
if (typeof globalThis.Headers === 'undefined') globalThis.Headers = Headers;
if (typeof globalThis.fetch === 'undefined') globalThis.fetch = fetch;
