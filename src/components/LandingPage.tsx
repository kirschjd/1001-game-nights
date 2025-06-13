import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(false);
  const [showBugs, setShowBugs] = useState(false);
  const [comment, setComment] = useState('');
  const [bugs, setBugs] = useState([
    { id: 1, text: 'Fix lobby title editing', completed: false },
    { id: 2, text: 'Improve mobile responsiveness', completed: false },
    { id: 3, text: 'Add game reconnection logic', completed: false }
  ]);

  const generateLobbySlug = (): string => {
    const words = [
      'horse', 'hat', 'wickerbasket', 'blue', 'mountain', 'river', 'coffee', 'laptop',
      'sunset', 'garden', 'book', 'candle', 'forest', 'ocean', 'pizza', 'guitar',
      'rainbow', 'cloud', 'bicycle', 'camera', 'thunder', 'whisper', 'diamond', 'feather',
      'knight', 'dragon', 'castle', 'magic', 'crystal', 'shadow', 'flame', 'frost'
    ];
    
    const shuffled = words.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3).join('-');
  };

  const handleNewLobby = () => {
    const slug = generateLobbySlug();
    navigate(`/lobby/${slug}`);
  };

  const handleExploreGames = () => {
    navigate('/explore');
  };

  const handleSubmitComment = async () => {
    if (!comment.trim()) return;
    
    try {
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: comment })
      });
      setComment('');
      setShowComments(false);
      alert('Comment submitted! Thank you for your feedback.');
    } catch (error) {
      alert('Failed to submit comment. Please try again.');
    }
  };

  const toggleBug = (id: number) => {
    setBugs(bugs.map(bug => 
      bug.id === id ? { ...bug, completed: !bug.completed } : bug
    ));
  };

  const addBug = () => {
    const newBugText = prompt('Enter new bug description:');
    if (newBugText && newBugText.trim()) {
      setBugs([...bugs, {
        id: Math.max(...bugs.map(b => b.id)) + 1,
        text: newBugText.trim(),
        completed: false
      }]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white">
      {/* Header */}
      <header className="text-center py-16">
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
          🎲 1001 Game Nights 🎮
        </h1>
        <p className="text-xl text-gray-300">
          Create lobbies, play games, have fun with friends!
        </p>
      </header>

      {/* Main Action Buttons */}
      <div className="flex flex-col items-center space-y-8 mb-16">
        <button
          onClick={handleNewLobby}
          className="bg-green-600 hover:bg-green-500 text-white text-2xl font-bold py-6 px-12 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 border-4 border-green-400"
        >
          🚀 Create New Lobby
        </button>
        
        <button
          onClick={handleExploreGames}
          className="bg-blue-600 hover:bg-blue-500 text-white text-2xl font-bold py-6 px-12 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 border-4 border-blue-400"
        >
          🎯 Explore Games
        </button>
      </div>

      {/* Footer Links */}
      <footer className="text-center space-y-4 pb-8">
        <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
          <a 
            href="https://github.com/johnkirschenheiter/1001-game-nights" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            📂 GitHub Repository
          </a>
          
          <button
            onClick={() => setShowComments(true)}
            className="hover:text-white transition-colors"
          >
            💬 Send Comments
          </button>
          
          <button
            onClick={() => setShowBugs(true)}
            className="hover:text-white transition-colors"
          >
            🐛 Current Bugs
          </button>
        </div>
        
        <p className="text-xs text-gray-500">
          Made by John Kirschenheiter • Powered by Claude and Railway.app
        </p>
      </footer>

      {/* Comments Modal */}
      {showComments && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-xl max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Send Comments</h2>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us what you think, report bugs, or suggest features..."
              className="w-full h-32 p-3 bg-gray-700 border border-gray-600 rounded-lg resize-none"
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowComments(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitComment}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bugs Modal */}
      {showBugs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-xl max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Current Bugs</h2>
            <div className="space-y-2 mb-4">
              {bugs.map(bug => (
                <div key={bug.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={bug.completed}
                    onChange={() => toggleBug(bug.id)}
                    className="w-4 h-4"
                  />
                  <span className={bug.completed ? 'line-through text-gray-500' : ''}>
                    {bug.text}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <button
                onClick={addBug}
                className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm"
              >
                Add Bug
              </button>
              <button
                onClick={() => setShowBugs(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;