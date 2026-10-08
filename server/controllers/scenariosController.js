const Scenario = require('../models/Scenario');

// GET /api/scenarios
exports.getAllScenarios = async (req, res) => {
  try {
    const scenarios = await Scenario.find().sort({ difficulty: 1 });
    res.json({ status: 'success', scenarios });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/scenarios/active
exports.getActiveScenarios = async (req, res) => {
  try {
    const scenarios = await Scenario.find({ active: true }).sort({ type: 1 });
    res.json({ status: 'success', scenarios });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/scenarios/:id
exports.getScenarioById = async (req, res) => {
  try {
    const scenario = await Scenario.findById(req.params.id);
    if (!scenario) return res.status(404).json({ message: 'Scenario not found' });
    res.json({ status: 'success', scenario });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
