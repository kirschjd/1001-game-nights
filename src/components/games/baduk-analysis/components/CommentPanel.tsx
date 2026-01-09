// Comment Panel - view and edit comments on the current node

import React, { useState, useEffect, useCallback } from 'react';

interface CommentPanelProps {
  comment: string;
  onUpdateComment: (comment: string) => void;
  moveNumber: number;
}

const CommentPanel: React.FC<CommentPanelProps> = ({
  comment,
  onUpdateComment,
  moveNumber
}) => {
  const [localComment, setLocalComment] = useState(comment);
  const [isEditing, setIsEditing] = useState(false);

  // Sync local state with prop changes
  useEffect(() => {
    setLocalComment(comment);
    setIsEditing(false);
  }, [comment, moveNumber]);

  const handleSave = useCallback(() => {
    if (localComment !== comment) {
      onUpdateComment(localComment);
    }
    setIsEditing(false);
  }, [localComment, comment, onUpdateComment]);

  const handleCancel = useCallback(() => {
    setLocalComment(comment);
    setIsEditing(false);
  }, [comment]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    }
  }, [handleCancel, handleSave]);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-semibold">
          Comment {moveNumber > 0 ? `(Move ${moveNumber})` : '(Root)'}
        </h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <div>
          <textarea
            value={localComment}
            onChange={(e) => setLocalComment(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm resize-none focus:outline-none focus:border-blue-500"
            placeholder="Add a comment..."
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
            >
              Cancel
            </button>
          </div>
          <p className="mt-1 text-gray-500 text-xs">
            Press Ctrl+Enter to save, Escape to cancel
          </p>
        </div>
      ) : (
        <div className="min-h-[60px]">
          {comment ? (
            <p className="text-gray-300 text-sm whitespace-pre-wrap">{comment}</p>
          ) : (
            <p className="text-gray-500 text-sm italic">No comment</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentPanel;
