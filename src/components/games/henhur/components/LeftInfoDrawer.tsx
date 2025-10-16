import React, { useEffect, useState } from 'react';

interface Props {
  variant: 'standard' | 'debug';
  socket?: any;
  slug?: string;
  playerName?: string;
  isLeader?: boolean;
}

const LeftInfoDrawer: React.FC<Props> = ({ variant, socket, slug, playerName }) => {
  const [localVariant, setLocalVariant] = useState<'standard' | 'debug'>(variant || 'standard');
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setLocalVariant(variant || 'standard');
  }, [variant]);

  useEffect(() => {
    if (!socket) return;

    const handleGameStarted = (data: any) => {
      if (data && data.type === 'henhur' && data.variant) {
        setLocalVariant(data.variant);
        console.debug('LeftInfoDrawer: updated variant from game-started:', data.variant);
      }
    };

    const handleGameUpdated = (data: any) => {
      if (data && data.type === 'henhur' && data.variant) {
        setLocalVariant(data.variant);
        console.debug('LeftInfoDrawer: updated variant from game-state-updated:', data.variant);
      }
    };

    socket.on('game-started', handleGameStarted);
    socket.on('game-state-updated', handleGameUpdated);

    return () => {
      socket.off('game-started', handleGameStarted);
      socket.off('game-state-updated', handleGameUpdated);
    };
  }, [socket]);

  const handleDebugClick = () => {
    if (!socket || !slug || !playerName) {
      console.warn('Missing socket/slug/playerName for debug action');
      return;
    }
    socket.emit('henhur-debug-action', { slug, player: playerName, action: 'sample-debug-button' });
  };

  return (
    <>
      <div className={`fixed left-0 w-64 bg-payne-grey/90 border-r-4 border-amber-400 shadow-lg z-0 flex flex-col p-4 transition-transform duration-300`} style={{ top: '72px', height: 'calc(100vh - 72px)', transform: open ? 'translateX(0)' : 'translateX(-100%)' }}>
        <button
          className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-full z-0 bg-amber-400 text-white px-2 py-2 rounded-r-lg shadow-lg focus:outline-none"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Hide info drawer' : 'Show info drawer'}
        >
          {open ? '←' : '→'}
        </button>
      
      <h3 className="text-xl font-bold text-amber-300 mb-4">Info</h3>
      <h3 className="text-xl font-bold text-amber-300 mb-4">Info</h3>
      {localVariant === 'standard' ? (
        <div>
          <h4 className="font-semibold mb-2">Quick Play Instructions</h4>
          <p className="text-sm text-gray-300">Placeholder: rules and tips go here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <h4 className="font-semibold mb-2">Debug Controls</h4>
          <button onClick={handleDebugClick} className="w-full px-3 py-2 bg-red-600 rounded text-white">Send Debug Action</button>
        </div>
      )}
  </div>
  </>
  );
};

export default LeftInfoDrawer;
