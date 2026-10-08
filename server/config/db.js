const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let memoryMongoServer;

const seedDefaultScenarios = async () => {
  const Scenario = require('../models/Scenario');
  const count = await Scenario.countDocuments();
  if (count === 0) {
    await Scenario.insertMany([
      {
        name: 'Urban Earthquake — Level 1',
        description: 'A moderate 5.8 magnitude earthquake strikes a dense urban office block. Learn basic Drop, Cover, and Hold procedures and guide civilians to safety.',
        difficulty: 'beginner',
        type: 'earthquake',
        durationSeconds: 180,
        active: true,
        objectives: ['Take cover during shaking', 'Help at least 2 injured NPCs', 'Reach the evacuation point'],
      },
      {
        name: 'Urban Earthquake — Level 2',
        description: 'A powerful 7.1 magnitude event with multiple aftershocks. Infrastructure damage is severe. Prioritise triage, calm panicking civilians, and navigate debris.',
        difficulty: 'intermediate',
        type: 'earthquake',
        durationSeconds: 240,
        active: true,
        objectives: ['Survive the main quake and aftershock', 'Help at least 4 NPCs', 'Evacuate within the time window'],
      },
      {
        name: 'Urban Earthquake — Level 3',
        description: 'Catastrophic 8.0 magnitude quake. Structural collapses, fires, and mass casualties. Leadership and rapid triage decisions determine survival rates.',
        difficulty: 'advanced',
        type: 'earthquake',
        durationSeconds: 300,
        active: true,
        objectives: ['Lead group evacuation', 'Maximise survivor count', 'Avoid all debris strikes'],
      },
      {
        name: 'Flash Flood Response',
        description: 'Coming soon — rapid flood water ingress into a low-lying residential area.',
        difficulty: 'intermediate',
        type: 'flood',
        durationSeconds: 0,
        active: false,
        objectives: [],
      },
      {
        name: 'Wildfire Evacuation',
        description: 'Coming soon — wind-driven wildfire approaching a suburban community.',
        difficulty: 'advanced',
        type: 'fire',
        durationSeconds: 0,
        active: false,
        objectives: [],
      },
    ]);
    console.log('🌱 Default scenarios seeded');
  }
};

const connectDB = async () => {
  const candidates = [process.env.MONGO_URI, 'mongodb://127.0.0.1:27017/disaster_sim', 'mongodb://localhost:27017/disaster_sim'];

  for (const uri of [...new Set(candidates.filter(Boolean))]) {
    try {
      const conn = await mongoose.connect(uri);
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      await seedDefaultScenarios();
      return;
    } catch (error) {
      const msg = error?.message || String(error);
      console.warn(`⚠️ MongoDB connection failed for ${uri}: ${msg}`);
    }
  }

  try {
    memoryMongoServer = await MongoMemoryServer.create();
    const conn = await mongoose.connect(memoryMongoServer.getUri());
    console.log(`✅ MongoDB Connected via in-memory server: ${conn.connection.host}`);
    await seedDefaultScenarios();
  } catch (memoryError) {
    console.error('❌ MongoDB connection error:', memoryError.message);
    process.exit(1);
  }
};

module.exports = connectDB;
