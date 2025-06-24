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
    <div className="min-h-screen bg-payne-grey-dark text-white relative">
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-40" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
        backgroundSize: '20px 20px'
      }}></div>

      {/* Header with Banner */}
      <header className="relative text-center py-16 overflow-hidden">
        {/* Banner Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/assets/banner-main.jpg" 
            alt="1001 Game Nights Banner"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40"></div>
        </div>
        
        {/* Content over banner */}
        <div className="relative z-10">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="/assets/icon-home.jpg" 
              alt="Home Icon"
              className="w-16 h-16 rounded-lg mr-4 border-2 border-lion"
            />
            <h1 className="text-6xl font-bold bg-gradient-to-r from-lion via-lion-light to-tea-rose bg-clip-text text-transparent">
              🎲 1001 Game Nights 🎮
            </h1>
          </div>
          <p className="text-xl text-gray-300">
            Create lobbies, play games, have fun with friends!
          </p>
        </div>
      </header>

      {/* Main Actions */}
      <main className="container mx-auto px-4 max-w-4xl relative z-10">
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Create New Lobby */}
          <div className="bg-payne-grey/20 backdrop-blur-md rounded-2xl p-8 hover:bg-lion/20 transition-all duration-300 hover:transform hover:scale-105 border border-payne-grey/30">
            <div className="text-center">
              <div className="text-6xl mb-4">🚪</div>
              <h2 className="text-3xl font-bold mb-4 text-lion-light">Create New Lobby</h2>
              <p className="text-gray-300 mb-6">
                Start a new game lobby with a unique URL. Invite friends and play together!
              </p>
              <button
                onClick={handleNewLobby}
                className="bg-gradient-to-r from-lion to-lion-light hover:from-lion-dark hover:to-lion px-8 py-4 rounded-lg text-xl font-semibold transition-all duration-300 hover:transform hover:scale-105 shadow-lg text-white"
              >
                Create Lobby
              </button>
            </div>
          </div>

          {/* Explore Games */}
          <div className="bg-payne-grey/20 backdrop-blur-md rounded-2xl p-8 hover:bg-lion/20 transition-all duration-300 hover:transform hover:scale-105 border border-payne-grey/30">
            <div className="text-center">
              <div className="text-6xl mb-4">🎯</div>
              <h2 className="text-3xl font-bold mb-4 text-lion-light">Explore Games</h2>
              <p className="text-gray-300 mb-6">
                Discover available games, learn the rules, and find the perfect game for your group.
              </p>
              <button
                onClick={handleExploreGames}
                className="bg-gradient-to-r from-payne-grey to-payne-grey-light hover:from-payne-grey-dark hover:to-payne-grey px-8 py-4 rounded-lg text-xl font-semibold transition-all duration-300 hover:transform hover:scale-105 shadow-lg text-white"
              >
                Explore Games
              </button>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-8 text-lion-light">Platform Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-payne-grey/20 rounded-xl p-6 border border-payne-grey/30">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-2 text-lion">Real-time Multiplayer</h3>
              <p className="text-gray-400">
                Powered by Socket.io for instant updates and smooth gameplay
              </p>
            </div>
            <div className="bg-payne-grey/20 rounded-xl p-6 border border-payne-grey/30">
              <div className="text-4xl mb-4">🔗</div>
              <h3 className="text-xl font-semibold mb-2 text-lion">Easy Lobby Sharing</h3>
              <p className="text-gray-400">
                Share unique 3-word URLs with friends to join your games
              </p>
            </div>
            <div className="bg-payne-grey/20 rounded-xl p-6 border border-payne-grey/30">
              <div className="text-4xl mb-4">🎮</div>
              <h3 className="text-xl font-semibold mb-2 text-lion">Multiple Games</h3>
              <p className="text-gray-400">
                War, Dice Factory, and more games coming soon
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setShowComments(!showComments)}
            className="bg-payne-grey hover:bg-payne-grey-light px-6 py-3 rounded-lg transition-colors border border-payne-grey-light"
          >
            💬 Feedback
          </button>
          <button
            onClick={() => setShowBugs(!showBugs)}
            className="bg-payne-grey hover:bg-payne-grey-light px-6 py-3 rounded-lg transition-colors border border-payne-grey-light"
          >
            🐛 Bug Tracker
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="bg-payne-grey/20 backdrop-blur-md rounded-xl p-6 mb-8 border border-payne-grey/30">
            <h3 className="text-2xl font-bold mb-4 text-lion-light">Submit Feedback</h3>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts, suggestions, or report issues..."
              className="w-full h-32 p-4 bg-payne-grey/30 rounded-lg border border-payne-grey text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-lion"
            />
            <div className="flex gap-4 mt-4">
              <button
                onClick={handleSubmitComment}
                className="bg-lion hover:bg-lion-dark px-6 py-2 rounded-lg transition-colors text-white font-semibold"
              >
                Submit
              </button>
              <button
                onClick={() => setShowComments(false)}
                className="bg-payne-grey hover:bg-payne-grey-dark px-6 py-2 rounded-lg transition-colors text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Bug Tracker Section */}
        {showBugs && (
          <div className="bg-payne-grey/20 backdrop-blur-md rounded-xl p-6 mb-8 border border-payne-grey/30">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-lion-light">Development Checklist</h3>
              <button
                onClick={addBug}
                className="bg-lion hover:bg-lion-dark px-4 py-2 rounded-lg text-sm transition-colors text-white font-semibold"
              >
                Add Task
              </button>
            </div>
            <div className="space-y-2">
              {bugs.map(bug => (
                <div
                  key={bug.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    bug.completed ? 'bg-lion/20 border border-lion/30' : 'bg-payne-grey/30 border border-payne-grey'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={bug.completed}
                    onChange={() => toggleBug(bug.id)}
                    className="w-5 h-5 text-lion focus:ring-lion"
                  />
                  <span className={bug.completed ? 'line-through text-gray-400' : 'text-white'}>
                    {bug.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-400 relative z-10">
        <p>Created by John Kirschenheiter • Powered by Claude and Railway.app</p>
      </footer>
    </div>
  );
};

export default LandingPage;