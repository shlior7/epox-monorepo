import { onMessage } from '@/shared/messaging';
import type { Message } from '@/shared/types';

console.log('Anton background service worker loaded');

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  // Toggle extension on the current tab
  chrome.tabs.sendMessage(tab.id, {
    type: 'TOGGLE_EXTENSION',
  } as Message);
});

// Handle messages from content script or popup
onMessage((message: Message, sender, sendResponse) => {
  if (message.type === 'OPEN_SIDEPANEL') {
    if (sender.tab?.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id });
    }
    sendResponse({ success: true });
    return true;
  }

  return false;
});

// Initialize extension state on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('Anton extension installed');
});
