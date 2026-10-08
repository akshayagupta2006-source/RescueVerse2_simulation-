const express = require('express');
const router = express.Router();
const { getPersonalAnalytics, getInstructorAnalytics } = require('../controllers/analyticsController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/me', protect, getPersonalAnalytics);
router.get('/instructor', protect, restrictTo('instructor', 'admin'), getInstructorAnalytics);

module.exports = router;
