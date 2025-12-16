import React, { useState } from 'react';

interface LobbyTitleEditorProps {
  title: string;
  isLeader: boolean;
  onTitleChange: (newTitle: string) => void;
  onCopyLink: () => void;
}

const LobbyTitleEditor: React.FC<LobbyTitleEditorProps> = ({
  title,
  isLeader,
  onTitleChange,
  onCopyLink,
}) => {
  const [editing, setEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState('');

  const handleSubmit = () => {
    if (tempTitle.trim()) {
      onTitleChange(tempTitle.trim());
      setEditing(false);
    }
  };

  const handleStartEdit = () => {
    setTempTitle(title);
    setEditing(true);
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Lobby Title
      </label>
      <div className="flex items-center space-x-2">
        {editing ? (
          <div className="flex-1 flex space-x-2">
            <input
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="flex-1 px-3 py-2 bg-payne-grey border border-payne-grey-light rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-lion"
              autoFocus
            />
            <button
              onClick={handleSubmit}
              className="px-3 py-2 bg-lion hover:bg-lion-dark rounded-lg text-white"
            >
              ✓
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-2 bg-payne-grey hover:bg-payne-grey-light rounded-lg text-white"
            >
              ✕
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 px-3 py-2 bg-payne-grey/30 border border-payne-grey rounded-lg text-white">
              {title}
            </div>
            {isLeader && (
              <button
                onClick={handleStartEdit}
                className="px-3 py-2 bg-lion hover:bg-lion-dark rounded-lg text-white"
              >
                ✏️
              </button>
            )}
          </>
        )}
        <button
          onClick={onCopyLink}
          className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white"
          title="Copy lobby link"
        >
          📋
        </button>
      </div>
    </div>
  );
};

export default LobbyTitleEditor;
