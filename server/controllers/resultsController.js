const TrainingResult = require('../models/TrainingResult');
const User = require('../models/User');

// POST /api/results  — Save simulation result
exports.saveResult = async (req, res) => {
  try {
    const {
      scenarioId,
      scenarioType,
      score,
      survivorsHelped,
      survivorsPanicked,
      survivorsLost,
      evacuated,
      healthRemaining,
      debrisHits,
      decisions,
      durationSeconds,
    } = req.body;

    if (!scenarioId || !scenarioType || score == null || durationSeconds == null) {
      return res.status(400).json({ message: 'Missing required result fields' });
    }

    const result = await TrainingResult.create({
      userId: req.user._id,
      scenarioId,
      scenarioType,
      score,
      survivorsHelped: survivorsHelped || 0,
      survivorsPanicked: survivorsPanicked || 0,
      survivorsLost: survivorsLost || 0,
      evacuated: evacuated || false,
      healthRemaining: healthRemaining || 0,
      debrisHits: debrisHits || 0,
      decisions: decisions || [],
      durationSeconds,
    });

    // Update user aggregate stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: {
        totalScore: score,
        totalSimulations: 1,
      },
    });

    res.status(201).json({ status: 'success', result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/results/my  — Get current user's results
exports.getMyResults = async (req, res) => {
  try {
    const results = await TrainingResult.find({ userId: req.user._id })
      .populate('scenarioId', 'name difficulty type')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ status: 'success', count: results.length, results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/results/leaderboard  — Global top scores
exports.getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await User.find({})
      .select('username totalScore totalSimulations badges')
      .sort({ totalScore: -1 })
      .limit(20);

    res.json({ status: 'success', leaderboard });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/results/:id  — Single result detail
exports.getResultById = async (req, res) => {
  try {
    const result = await TrainingResult.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate('scenarioId', 'name difficulty type objectives');

    if (!result) return res.status(404).json({ message: 'Result not found' });

    res.json({ status: 'success', result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
