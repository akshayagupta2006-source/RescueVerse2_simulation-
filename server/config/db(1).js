const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/disaster_sim');
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Seed default scenarios on first connect
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
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
