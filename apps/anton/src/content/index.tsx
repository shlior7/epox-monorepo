import React from 'react';
import ReactDOM from 'react-dom/client';
import { AnnotationOverlay } from './AnnotationOverlay';
import './styles.css';

console.log('Anton content script loaded');

// Create a container for the React app
const container = document.createElement('div');
container.id = 'anton-root';
container.style.cssText = 'all: initial; position: fixed; top: 0; left: 0; z-index: 2147483646;';
document.documentElement.appendChild(container);

// Create shadow DOM for style isolation
const shadowRoot = container.attachShadow({ mode: 'open' });

// Create shadow container
const shadowContainer = document.createElement('div');
shadowRoot.appendChild(shadowContainer);

// Inject styles into shadow DOM
const styleLink = document.createElement('link');
styleLink.rel = 'stylesheet';
styleLink.href = chrome.runtime.getURL('src/content/styles.css');
shadowRoot.appendChild(styleLink);

// Mount React app in shadow DOM
const root = ReactDOM.createRoot(shadowContainer);
root.render(
  <React.StrictMode>
    <AnnotationOverlay />
  </React.StrictMode>
);
