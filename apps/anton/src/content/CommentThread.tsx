import { useState } from 'react';
import type { Annotation, Reply } from '@/shared/types';
import { getViewportPosition } from '@/lib/positioning';

interface CommentThreadProps {
  annotation: Annotation;
  onClose: () => void;
  onUpdate: (updates: Partial<Annotation>) => void;
  onDelete: () => void;
}

export function CommentThread({ annotation, onClose, onUpdate, onDelete }: CommentThreadProps) {
  const [replyText, setReplyText] = useState('');
  const position = getViewportPosition(annotation.position);

  if (!position) return null;

  const handleAddReply = () => {
    if (!replyText.trim()) return;

    const newReply: Reply = {
      id: crypto.randomUUID(),
      content: replyText,
      author: 'User',
      createdAt: new Date().toISOString(),
    };

    onUpdate({
      replies: [...(annotation.replies || []), newReply],
    });

    setReplyText('');
  };

  const handleResolve = () => {
    onUpdate({ resolved: !annotation.resolved });
  };

  const style = {
    left: `${position.x + 40}px`,
    top: `${position.y}px`,
  };

  return (
    <div className="anton-comment-thread" style={style} data-testid="anton-comment-thread">
      <div className="flex justify-between items-start mb-2">
        <h3>Comment</h3>
        <button
          className="text-dark-muted hover:text-dark-text text-lg"
          onClick={onClose}
          data-testid="anton-comment-close"
        >
          ×
        </button>
      </div>

      <div className="anton-comment-content">{annotation.content}</div>

      <div className="anton-comment-meta">
        {annotation.author} · {new Date(annotation.createdAt).toLocaleDateString()}
      </div>

      {annotation.resolved && (
        <div className="mt-2 text-xs text-accent-success">✓ Resolved</div>
      )}

      {/* Replies */}
      {annotation.replies && annotation.replies.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-dark-border pt-2">
          {annotation.replies.map((reply) => (
            <div key={reply.id} className="text-sm">
              <div className="anton-comment-content">{reply.content}</div>
              <div className="anton-comment-meta">
                {reply.author} · {new Date(reply.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply input */}
      <textarea
        className="anton-comment-input"
        placeholder="Add a reply..."
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.metaKey) {
            handleAddReply();
          }
        }}
        data-testid="anton-reply-input"
      />

      <div className="anton-comment-actions">
        <button className="anton-btn" onClick={handleAddReply} data-testid="anton-add-reply">
          Reply
        </button>
        <button
          className="anton-btn anton-btn-secondary"
          onClick={handleResolve}
          data-testid="anton-resolve-btn"
        >
          {annotation.resolved ? 'Unresolve' : 'Resolve'}
        </button>
        <button
          className="anton-btn anton-btn-secondary"
          onClick={onDelete}
          data-testid="anton-delete-btn"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
