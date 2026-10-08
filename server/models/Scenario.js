const mongoose = require('mongoose');

const scenarioSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      required: true,
    },
    type: {
      type: String,
      enum: ['earthquake', 'flood', 'fire', 'cyclone'],
      required: true,
    },
    durationSeconds: { type: Number, required: true },
    objectives: [{ type: String }],
    active: { type: Boolean, default: true },
    thumbnailKey: { type: String, default: 'earthquake' },
    passingScore: { type: Number, default: 450 },
    maxScore: { type: Number, default: 1000 },
    npcCount: { type: Number, default: 8 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Scenario', scenarioSchema);
