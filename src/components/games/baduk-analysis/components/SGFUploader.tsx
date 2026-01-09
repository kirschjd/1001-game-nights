// SGF File Uploader Component

import React, { useCallback, useRef } from 'react';
import { isValidSGF, extractSGFInfo } from '../utils/sgfParser';

interface SGFUploaderProps {
  onUpload: (sgfContent: string) => void;
}

const SGFUploader: React.FC<SGFUploaderProps> = ({ onUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;

      if (!isValidSGF(content)) {
        alert('Invalid SGF file format');
        return;
      }

      // Preview info
      const info = extractSGFInfo(content);
      const preview = [
        info.blackPlayer ? `Black: ${info.blackPlayer}` : null,
        info.whitePlayer ? `White: ${info.whitePlayer}` : null,
        info.result ? `Result: ${info.result}` : null,
        info.event ? `Event: ${info.event}` : null
      ].filter(Boolean).join('\n');

      if (preview) {
        console.log('Loading SGF:\n' + preview);
      }

      onUpload(content);
    };

    reader.onerror = () => {
      alert('Failed to read file');
    };

    reader.readAsText(file);

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onUpload]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-white font-semibold mb-2">Load SGF</h3>

      <input
        ref={fileInputRef}
        type="file"
        accept=".sgf"
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        onClick={handleClick}
        className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded transition-colors"
      >
        Upload SGF File
      </button>

      <p className="mt-2 text-gray-500 text-xs">
        Load a game from an SGF file for analysis
      </p>
    </div>
  );
};

export default SGFUploader;
