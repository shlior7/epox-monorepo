'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, MessageCircle, X, Sparkles, Bot } from 'lucide-react';
import clsx from 'clsx';
import type { Flow, FlowGenerationSettings, Product } from '@/lib/types/app-types';
import { STYLE_OPTIONS, SCENE_TYPES, LIGHTING_OPTIONS, CAMERA_ANGLES, ASPECT_RATIOS } from './constants';
import styles from './SceneStudioView.module.scss';

interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: FlowAction[];
}

interface FlowAction {
  type: 'update_settings' | 'add_product' | 'remove_product' | 'execute' | 'create_flow';
  payload: Record<string, unknown>;
  label: string;
}

interface FlowAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFlow: Flow | null;
  flows: Flow[];
  products: Product[];
  onUpdateSettings: (settings: Partial<FlowGenerationSettings>) => void;
  onRemoveProduct: (productId: string) => void;
  onExecute: () => void;
  onCreateFlow: () => void;
  onSelectFlow: (flowId: string) => void;
}

// Simple intent parser for flow operations
function parseUserIntent(message: string, selectedFlow: Flow | null, products: Product[]): { response: string; actions: FlowAction[] } {
  const lowerMessage = message.toLowerCase();
  const actions: FlowAction[] = [];
  let response = '';

  // Check for style-related requests
  const styleMatch = STYLE_OPTIONS.find(
    (s) => lowerMessage.includes(s.toLowerCase()) || lowerMessage.includes(s.split(' ')[0].toLowerCase())
  );
  if (styleMatch && (lowerMessage.includes('style') || lowerMessage.includes('make it') || lowerMessage.includes('change to'))) {
    actions.push({
      type: 'update_settings',
      payload: { style: styleMatch },
      label: `Set style to ${styleMatch}`,
    });
    response = `I'll update the style to "${styleMatch}".`;
  }

  // Check for lighting requests
  const lightingMatch = LIGHTING_OPTIONS.find(
    (l) => lowerMessage.includes(l.toLowerCase()) || lowerMessage.includes(l.split(' ')[0].toLowerCase())
  );
  if (lightingMatch && (lowerMessage.includes('lighting') || lowerMessage.includes('light'))) {
    actions.push({
      type: 'update_settings',
      payload: { lighting: lightingMatch },
      label: `Set lighting to ${lightingMatch}`,
    });
    response += (response ? ' ' : '') + `I'll set the lighting to "${lightingMatch}".`;
  }

  // Check for room type requests
  const roomMatch = SCENE_TYPES.find((r) => lowerMessage.includes(r.toLowerCase()));
  if (roomMatch && (lowerMessage.includes('room') || lowerMessage.includes('scene') || lowerMessage.includes('setting'))) {
    actions.push({
      type: 'update_settings',
      payload: { sceneType: roomMatch },
      label: `Set room type to ${roomMatch}`,
    });
    response += (response ? ' ' : '') + `I'll set the room type to "${roomMatch}".`;
  }

  // Check for camera angle requests
  const angleMatch = CAMERA_ANGLES.find((a) => lowerMessage.includes(a.toLowerCase()));
  if (angleMatch && (lowerMessage.includes('angle') || lowerMessage.includes('camera') || lowerMessage.includes('view'))) {
    actions.push({
      type: 'update_settings',
      payload: { cameraAngle: angleMatch },
      label: `Set camera angle to ${angleMatch}`,
    });
    response += (response ? ' ' : '') + `I'll set the camera angle to "${angleMatch}".`;
  }

  // Check for aspect ratio requests
  const aspectMatch = ASPECT_RATIOS.find((a) => lowerMessage.includes(a.toLowerCase()) || lowerMessage.includes(a.replace(':', 'x')));
  if (aspectMatch && (lowerMessage.includes('aspect') || lowerMessage.includes('ratio') || lowerMessage.includes('format'))) {
    actions.push({
      type: 'update_settings',
      payload: { aspectRatio: aspectMatch },
      label: `Set aspect ratio to ${aspectMatch}`,
    });
    response += (response ? ' ' : '') + `I'll set the aspect ratio to "${aspectMatch}".`;
  }

  // Check for generate/execute requests
  if (
    lowerMessage.includes('generate') ||
    lowerMessage.includes('create image') ||
    lowerMessage.includes('run') ||
    lowerMessage.includes('execute')
  ) {
    if (selectedFlow && selectedFlow.productIds.length > 0) {
      actions.push({
        type: 'execute',
        payload: {},
        label: 'Generate image',
      });
      response += (response ? ' ' : '') + "I'll start generating the image now.";
    } else {
      response = 'Please add products to the flow first before generating.';
    }
  }

  // Check for add product requests
  if (lowerMessage.includes('add product') || lowerMessage.includes('add a product') || lowerMessage.includes('select product')) {
    actions.push({
      type: 'add_product',
      payload: {},
      label: 'Open product selector',
    });
    response = "I'll open the product selector for you.";
  }

  // Check for new flow requests
  if (lowerMessage.includes('new flow') || lowerMessage.includes('create flow') || lowerMessage.includes('add flow')) {
    actions.push({
      type: 'create_flow',
      payload: {},
      label: 'Create new flow',
    });
    response = "I'll create a new flow for you.";
  }

  // Check for custom prompt text
  if (lowerMessage.includes('prompt:') || lowerMessage.includes('instruction:')) {
    const promptText = message.split(/prompt:|instruction:/i)[1]?.trim();
    if (promptText) {
      actions.push({
        type: 'update_settings',
        payload: { promptText },
        label: 'Set custom prompt',
      });
      response = `I'll add that as a custom instruction: "${promptText}"`;
    }
  }

  // Default response if no actions matched
  if (!response) {
    response = `I can help you configure your flow. Try asking me to:
• Change the style (e.g., "make it modern minimalist")
• Set the lighting (e.g., "use warm lighting")
• Choose a room type (e.g., "set it in a living room")
• Adjust the camera angle (e.g., "use a low angle view")
• Generate the image (e.g., "generate the scene")
• Add products (e.g., "add a product")`;
  }

  return { response, actions };
}

export function FlowAssistant({
  isOpen,
  onClose,
  selectedFlow,
  flows,
  products,
  onUpdateSettings,
  onRemoveProduct,
  onExecute,
  onCreateFlow,
  onSelectFlow,
}: FlowAssistantProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hi! I'm your Scene Studio assistant. I can help you configure flows, change settings, and generate images. What would you like to do?",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isProcessing) return;

    const userMessage: AssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsProcessing(true);

    // Parse intent and generate response
    const { response, actions } = parseUserIntent(inputText, selectedFlow, products);

    // Simulate a brief delay for natural feel
    await new Promise((resolve) => setTimeout(resolve, 500));

    const assistantMessage: AssistantMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: response,
      timestamp: new Date(),
      actions: actions.length > 0 ? actions : undefined,
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsProcessing(false);
  }, [inputText, isProcessing, selectedFlow, products]);

  const handleActionClick = useCallback(
    (action: FlowAction) => {
      let confirmationMessage = `✓ ${action.label}`;

      switch (action.type) {
        case 'update_settings':
          onUpdateSettings(action.payload as Partial<FlowGenerationSettings>);
          break;
        case 'add_product':
          // Products are now added via drag from the side panel
          confirmationMessage = 'To add products, drag them from the Products panel on the left side.';
          break;
        case 'execute':
          onExecute();
          break;
        case 'create_flow':
          onCreateFlow();
          break;
      }

      // Add confirmation message
      setMessages((prev) => [
        ...prev,
        {
          id: `action-${Date.now()}`,
          role: 'assistant',
          content: confirmationMessage,
          timestamp: new Date(),
        },
      ]);
    },
    [onUpdateSettings, onExecute, onCreateFlow]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  if (!isOpen) return null;

  return (
    <div className={styles.assistantOverlay} onClick={onClose}>
      <div className={styles.assistantPanel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.assistantHeader}>
          <div className={styles.assistantTitle}>
            <Bot style={{ width: 20, height: 20 }} />
            <span>Flow Assistant</span>
          </div>
          <button className={styles.iconButton} onClick={onClose} type="button">
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <div className={styles.assistantMessages}>
          {messages.map((message) => (
            <div key={message.id} className={clsx(styles.assistantMessage, styles[message.role])}>
              {message.role === 'assistant' && (
                <div className={styles.messageAvatar}>
                  <Sparkles style={{ width: 14, height: 14 }} />
                </div>
              )}
              <div className={styles.messageContent}>
                <p>{message.content}</p>
                {message.actions && message.actions.length > 0 && (
                  <div className={styles.actionButtons}>
                    {message.actions.map((action, idx) => (
                      <button key={idx} className={styles.actionButton} onClick={() => handleActionClick(action)} type="button">
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className={clsx(styles.assistantMessage, styles.assistant)}>
              <div className={styles.messageAvatar}>
                <Sparkles style={{ width: 14, height: 14 }} />
              </div>
              <div className={styles.messageContent}>
                <Loader2 className={styles.spinner} style={{ width: 16, height: 16 }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.assistantInput}>
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me to configure your flow..."
            rows={2}
            disabled={isProcessing}
          />
          <button className={styles.sendButton} onClick={handleSend} disabled={!inputText.trim() || isProcessing} type="button">
            {isProcessing ? (
              <Loader2 className={styles.spinner} style={{ width: 18, height: 18 }} />
            ) : (
              <Send style={{ width: 18, height: 18 }} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
