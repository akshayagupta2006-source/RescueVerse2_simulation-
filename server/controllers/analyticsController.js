const TrainingResult = require('../models/TrainingResult');
const User = require('../models/User');

// GET /api/analytics/instructor — Aggregate analytics (instructor/admin only)
exports.getInstructorAnalytics = async (req, res) => {
  try {
    const totalRuns = await TrainingResult.countDocuments();
    const trainees  = await User.countDocuments({ role: 'trainee' });

    const aggResult = await TrainingResult.aggregate([
      { $group: {
        _id:          null,
        avgScore:     { $avg: '$score' },
        passedCount:  { $sum: { $cond: ['$passed', 1, 0] } },
      }},
    ]);

    const avgScore    = aggResult[0] ? Math.round(aggResult[0].avgScore) : 0;
    const passedCount = aggResult[0] ? aggResult[0].passedCount : 0;
    const successRate = totalRuns > 0 ? Math.round((passedCount / totalRuns) * 100) : 0;

    // Grade distribution
    const gradeAgg = await TrainingResult.aggregate([
      { $group: { _id: '$grade', count: { $sum: 1 } } },
    ]);
    const gradeDistribution = { S: 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
    gradeAgg.forEach(g => { gradeDistribution[g._id] = g.count; });

    // Recent 20 runs
    const recentRuns = await TrainingResult.find()
      .populate('userId', 'username')
      .populate('scenarioId', 'name type')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ status: 'success', trainees, totalRuns, avgScore, successRate, gradeDistribution, recentRuns });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/analytics/me  — Personal performance analytics
exports.getPersonalAnalytics = async (req, res) => {
  try {
    const results = await TrainingResult.find({ userId: req.user._id });

    if (results.length === 0) {
      return res.json({ status: 'success', analytics: null });
    }

    const totalRuns = results.length;
    const passed = results.filter((r) => r.passed).length;
    const avgScore = Math.round(results.reduce((a, r) => a + r.score, 0) / totalRuns);
    const avgHealth = Math.round(results.reduce((a, r) => a + r.healthRemaining, 0) / totalRuns);
    const totalSurvivors = results.reduce((a, r) => a + r.survivorsHelped, 0);
    const successRate = Math.round((passed / totalRuns) * 100);

    // Grade distribution
    const gradeMap = { S: 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
    results.forEach((r) => { gradeMap[r.grade] = (gradeMap[r.grade] || 0) + 1; });

    // Score over time (last 10)
    const recent = results
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .slice(-10)
      .map((r) => ({ date: r.createdAt, score: r.score, grade: r.grade }));

    // Most common mistake
    const allDecisions = results.flatMap((r) => r.decisions);
    const penalties = allDecisions.filter((d) => d.scoreImpact < 0);
    const penaltyMap = {};
    penalties.forEach((d) => {
      penaltyMap[d.action] = (penaltyMap[d.action] || 0) + 1;
    });
    const topMistake = Object.entries(penaltyMap).sort((a, b) => b[1] - a[1])[0];

    res.json({
      status: 'success',
      analytics: {
        totalRuns,
        passed,
        successRate,
        avgScore,
        avgHealth,
        totalSurvivors,
        gradeDistribution: gradeMap,
        scoreHistory: recent,
        topMistake: topMistake ? { action: topMistake[0], count: topMistake[1] } : null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
