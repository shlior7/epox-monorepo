import type { Message } from './types';

export async function sendMessage<T = any>(message: Message): Promise<T> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response);
    });
  });
}

export async function sendMessageToTab<T = any>(tabId: number, message: Message): Promise<T> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      resolve(response);
    });
  });
}

export function onMessage(callback: (message: Message, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => void): void {
  chrome.runtime.onMessage.addListener(callback);
}
