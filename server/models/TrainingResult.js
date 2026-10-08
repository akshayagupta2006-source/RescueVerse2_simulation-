const mongoose = require('mongoose');

const decisionSchema = new mongoose.Schema({
  timestamp: { type: Number, required: true },   // seconds from sim start
  phase: { type: String, required: true },        // calm | shaking_strong | shaking_weak | evacuation
  action: { type: String, required: true },       // took_cover | helped_npc | calmed_npc | evacuated | ignored_npc | hit_by_debris
  target: { type: String, default: null },        // NPC id or null
  scoreImpact: { type: Number, default: 0 },      // +/- points this decision caused
}, { _id: false });

const trainingResultSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    scenarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scenario',
      required: true,
    },
    scenarioType: {
      type: String,
      enum: ['earthquake', 'flood', 'fire', 'cyclone'],
      required: true,
    },

    // Outcome metrics
    score: { type: Number, required: true, min: 0 },
    survivorsHelped: { type: Number, default: 0 },
    survivorsPanicked: { type: Number, default: 0 },
    survivorsLost: { type: Number, default: 0 },
    evacuated: { type: Boolean, default: false },
    healthRemaining: { type: Number, min: 0, max: 100, default: 100 },
    debrisHits: { type: Number, default: 0 },

    // Decision log
    decisions: [decisionSchema],

    // Timing
    durationSeconds: { type: Number, required: true },

    // Performance tier
    grade: {
      type: String,
      enum: ['S', 'A', 'B', 'C', 'D', 'F'],
      default: 'F',
    },
    passed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compute grade before saving
trainingResultSchema.pre('save', function (next) {
  const s = this.score;
  if (s >= 900) this.grade = 'S';
  else if (s >= 750) this.grade = 'A';
  else if (s >= 600) this.grade = 'B';
  else if (s >= 450) this.grade = 'C';
  else if (s >= 300) this.grade = 'D';
  else this.grade = 'F';

  this.passed = s >= 450 && this.evacuated;
  next();
});

module.exports = mongoose.model('TrainingResult', trainingResultSchema);
