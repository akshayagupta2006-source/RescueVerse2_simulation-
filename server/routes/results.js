const express = require('express');
const router = express.Router();
const { saveResult, getMyResults, getLeaderboard, getResultById } = require('../controllers/resultsController');
const { protect } = require('../middleware/auth');

router.use(protect); // All result routes require authentication

router.post('/', saveResult);
router.get('/my', getMyResults);
router.get('/leaderboard', getLeaderboard);
router.get('/:id', getResultById);

module.exports = router;
