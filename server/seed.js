/**
 * seed.js — Run once to populate MongoDB with scenarios and a demo instructor account.
 *
 * Usage:  cd server && node seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/disaster_sim';

// ─── Inline schemas (avoid circular deps) ─────────────────────────────────────
const userSchema = new mongoose.Schema({
  username: String, email: String, password: String, role: String,
  totalScore: { type: Number, default: 0 }, totalSimulations: { type: Number, default: 0 }, badges: [String],
}, { timestamps: true });

const scenarioSchema = new mongoose.Schema({
  name: String, description: String, difficulty: String, type: String,
  durationSeconds: Number, objectives: [String], active: Boolean,
  passingScore: Number, maxScore: Number, npcCount: Number,
}, { timestamps: true });

const User     = mongoose.model('User',     userSchema);
const Scenario = mongoose.model('Scenario', scenarioSchema);

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // ── Users ──────────────────────────────────────────────────────────────────
  const instructorExists = await User.findOne({ email: 'instructor@drts.local' });
  if (!instructorExists) {
    const hashed = await bcrypt.hash('instructor123', 12);
    await User.create({
      username: 'instructor_01',
      email:    'instructor@drts.local',
      password: hashed,
      role:     'instructor',
    });
    console.log('👤 Demo instructor created — instructor@drts.local / instructor123');
  } else {
    console.log('👤 Instructor already exists — skipping');
  }

  // ── Scenarios ──────────────────────────────────────────────────────────────
  await Scenario.deleteMany({});
  console.log('🗑  Cleared existing scenarios');

  const scenarios = [
    // ── Earthquake ──────────────────────────────────────────────────────────
    {
      name:            'Urban Earthquake — Level 1',
      description:     'A moderate 5.8 magnitude earthquake strikes a dense urban office block. Learn basic Drop, Cover, and Hold procedures and guide civilians to safety.',
      difficulty:      'beginner',
      type:            'earthquake',
      durationSeconds: 67,    // 15+20+15+17 (beginner cfg)
      active:          true,
      objectives: [
        'Take cover under a desk during shaking',
        'Stabilise at least 2 injured civilians',
        'Reach the evacuation exit before time expires',
      ],
      passingScore: 450,
      maxScore:     1000,
      npcCount:     6,
    },
    {
      name:            'Urban Earthquake — Level 2',
      description:     'A powerful 7.1 magnitude event with multiple aftershocks. Infrastructure damage is severe. Prioritise triage, calm panicking civilians, and navigate debris fields.',
      difficulty:      'intermediate',
      type:            'earthquake',
      durationSeconds: 75,
      active:          true,
      objectives: [
        'Survive the main quake and aftershock without dying',
        'Stabilise at least 4 civilians',
        'Evacuate within the time window',
      ],
      passingScore: 450,
      maxScore:     1000,
      npcCount:     8,
    },
    {
      name:            'Urban Earthquake — Level 3',
      description:     'Catastrophic 8.0 magnitude quake. Structural collapses, fires, and mass casualties. Leadership and rapid triage decisions determine survival rates.',
      difficulty:      'advanced',
      type:            'earthquake',
      durationSeconds: 73,
      active:          true,
      objectives: [
        'Lead group evacuation with maximal survivor count',
        'Avoid all debris strikes',
        'Calm all panicking civilians before evacuation',
      ],
      passingScore: 450,
      maxScore:     1000,
      npcCount:     10,
    },

    // ── Flood ──────────────────────────────────────────────────────────────
    {
      name:            'Flood Response — Level 1',
      description:     'Rising water ingress into a low-lying residential area. Navigate streets to rescue stranded residents and reach high ground.',
      difficulty:      'beginner',
      type:            'flood',
      durationSeconds: 75,
      active:          true,
      objectives: [
        'Move to high ground when water rises',
        'Rescue at least 2 civilians',
        'Reach the evacuation zone before time expires'
      ],
      passingScore:    450,
      maxScore:        1000,
      npcCount:        6,
    },
    {
      name:            'Flood Response — Level 2',
      description:     'Flash flood scenario. Fast rising water and floating debris. Find safe spots and rescue panicking civilians.',
      difficulty:      'intermediate',
      type:            'flood',
      durationSeconds: 75,
      active:          true,
      objectives: [
        'Survive the rising water and debris',
        'Rescue at least 4 civilians',
        'Evacuate successfully'
      ],
      passingScore:    450,
      maxScore:        1000,
      npcCount:        8,
    },
    {
      name:            'Flood Response — Level 3',
      description:     'Severe flood event. High water speeds, significant debris, and rapid water accumulation. Rapid decision making is essential.',
      difficulty:      'advanced',
      type:            'flood',
      durationSeconds: 75,
      active:          true,
      objectives: [
        'Navigate extreme water conditions',
        'Rescue maximum civilians',
        'Evacuate successfully'
      ],
      passingScore:    450,
      maxScore:        1000,
      npcCount:        10,
    },
    {
      name:            'Wildfire Evacuation',
      description:     'A wind-driven wildfire approaches a suburban community. Coordinate evacuation routes while rescuing trapped residents from cut-off properties.',
      difficulty:      'advanced',
      type:            'fire',
      durationSeconds: 0,
      active:          false,
      objectives:      [],
      passingScore:    450,
      maxScore:        1000,
      npcCount:        10,
    },
    {
      name:            'Cyclone Shelter Protocol',
      description:     'A Category 4 cyclone is hours away. Guide a coastal population to storm shelters, triaging medical emergencies along the way.',
      difficulty:      'advanced',
      type:            'cyclone',
      durationSeconds: 0,
      active:          false,
      objectives:      [],
      passingScore:    450,
      maxScore:        1000,
      npcCount:        12,
    },
  ];

  await Scenario.insertMany(scenarios);
  console.log(`🌱 Seeded ${scenarios.length} scenarios`);

  await mongoose.disconnect();
  console.log('🔌 Disconnected. Seed complete.');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
