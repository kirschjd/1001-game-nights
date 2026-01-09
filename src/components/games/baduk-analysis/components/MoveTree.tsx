// Move Tree Component - displays and allows navigation of move tree

import React, { useMemo } from 'react';
import { MoveTree as MoveTreeType, SerializedMoveTreeNode } from '../types/baduk.types';

interface MoveTreeProps {
  moveTree: MoveTreeType;
  onSelectNode: (nodeId: string) => void;
}

const MoveTree: React.FC<MoveTreeProps> = ({ moveTree, onSelectNode }) => {
  const { nodes, currentNodeId, pathToCurrentNode } = moveTree;

  // Build the main line and variations
  const treeStructure = useMemo(() => {
    const mainLine: SerializedMoveTreeNode[] = [];
    const variations: Map<string, SerializedMoveTreeNode[][]> = new Map();

    // Walk from root following first child to build main line
    let currentId = 'root';
    while (currentId) {
      const node = nodes[currentId];
      if (!node) break;

      mainLine.push(node);

      // If there are variations (more than one child), store them
      if (node.childrenIds.length > 1) {
        const varLines: SerializedMoveTreeNode[][] = [];
        for (let i = 1; i < node.childrenIds.length; i++) {
          const varLine: SerializedMoveTreeNode[] = [];
          let varId = node.childrenIds[i];
          while (varId) {
            const varNode = nodes[varId];
            if (!varNode) break;
            varLine.push(varNode);
            varId = varNode.childrenIds[0]; // Follow main line of variation
          }
          if (varLine.length > 0) {
            varLines.push(varLine);
          }
        }
        if (varLines.length > 0) {
          variations.set(currentId, varLines);
        }
      }

      currentId = node.childrenIds[0];
    }

    return { mainLine, variations };
  }, [nodes]);

  const renderMoveNumber = (node: SerializedMoveTreeNode) => {
    const isOnPath = pathToCurrentNode.includes(node.id);
    const isCurrent = node.id === currentNodeId;
    const hasVariations = node.hasVariations;

    let bgColor = 'bg-gray-700';
    let textColor = 'text-gray-300';

    if (isCurrent) {
      bgColor = 'bg-blue-600';
      textColor = 'text-white';
    } else if (isOnPath) {
      bgColor = 'bg-gray-600';
      textColor = 'text-white';
    }

    return (
      <button
        key={node.id}
        onClick={() => onSelectNode(node.id)}
        className={`
          inline-flex items-center justify-center
          min-w-[24px] h-6 px-1 mx-0.5
          ${bgColor} ${textColor}
          text-xs font-medium rounded
          hover:bg-blue-500 hover:text-white
          transition-colors
          ${hasVariations ? 'ring-1 ring-yellow-500' : ''}
        `}
        title={node.isPass ? 'Pass' : node.comment ? `Move ${node.moveNumber}: ${node.comment.substring(0, 50)}...` : `Move ${node.moveNumber}`}
      >
        {node.isPass ? 'P' : node.moveNumber}
      </button>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 max-h-48 overflow-auto">
      <h3 className="text-white font-semibold mb-2">Move Tree</h3>

      {/* Main line */}
      <div className="flex flex-wrap items-center gap-0.5">
        {treeStructure.mainLine.map((node, index) => (
          <React.Fragment key={node.id}>
            {node.id !== 'root' && renderMoveNumber(node)}

            {/* Show variation marker */}
            {treeStructure.variations.has(node.id) && (
              <span className="text-yellow-500 text-xs mx-1" title="Variations exist">
                [+{treeStructure.variations.get(node.id)!.length}]
              </span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Variations section */}
      {treeStructure.variations.size > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <h4 className="text-gray-400 text-xs mb-2">Variations:</h4>
          {Array.from(treeStructure.variations.entries()).map(([parentId, varLines]) => {
            const parentNode = nodes[parentId];
            return (
              <div key={parentId} className="mb-2">
                <span className="text-gray-500 text-xs">
                  After move {parentNode?.moveNumber || 0}:
                </span>
                {varLines.map((varLine, varIndex) => (
                  <div key={varIndex} className="ml-2 flex flex-wrap items-center gap-0.5">
                    <span className="text-gray-500 text-xs mr-1">
                      {String.fromCharCode(65 + varIndex)}:
                    </span>
                    {varLine.map(node => renderMoveNumber(node))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Node count */}
      <div className="mt-2 text-gray-500 text-xs">
        Total nodes: {moveTree.nodeCount}
      </div>
    </div>
  );
};

export default MoveTree;
