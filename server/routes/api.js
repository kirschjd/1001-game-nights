// 1001 Game Nights - API Routes
// Version: 2.0.0 - Extracted from main server file
// Updated: December 2024

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// In-memory storage (should be moved to database in production)
const comments = [];

/**
 * Submit a new comment
 */
router.post('/comments', (req, res) => {
  const { content } = req.body;
  
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Comment content is required' });
  }
  
  const comment = {
    id: uuidv4(),
    content: content.trim(),
    timestamp: new Date().toISOString(),
    ip: req.ip
  };
  
  comments.push(comment);
  console.log('New comment received');
  
  res.json({ success: true, id: comment.id });
});

/**
 * Get all comments (admin endpoint)
 */
router.get('/comments', (req, res) => {
  res.json(comments);
});

/**
 * Get lobby information
 */
router.get('/lobbies/:slug', (req, res) => {
  // Note: This requires access to the lobbies Map
  // We'll need to pass it as a parameter or use a shared store
  const { lobbies } = req.app.locals;
  
  const lobby = lobbies.get(req.params.slug);
  if (!lobby) {
    return res.status(404).json({ error: 'Lobby not found' });
  }
  
  res.json(lobby);
});

module.exports = router;