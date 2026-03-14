import { io } from "socket.io-client";

import { SOCKET_BASE_URL } from "./api";

let sharedUserSocket = null;

export function createUserSocket() {
  return io(SOCKET_BASE_URL, {
    autoConnect: true,
    withCredentials: true
  });
}

export function getSharedUserSocket() {
  if (!sharedUserSocket) {
    sharedUserSocket = io(SOCKET_BASE_URL, {
      autoConnect: true,
      withCredentials: true
    });
  }

  return sharedUserSocket;
}

export function disconnectSharedUserSocket() {
  if (!sharedUserSocket) {
    return;
  }

  sharedUserSocket.disconnect();
  sharedUserSocket = null;
}
