const express = require('express');
const router = express.Router();
const { getAllScenarios, getActiveScenarios, getScenarioById } = require('../controllers/scenariosController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getAllScenarios);
router.get('/active', protect, getActiveScenarios);
router.get('/:id', protect, getScenarioById);

module.exports = router;
