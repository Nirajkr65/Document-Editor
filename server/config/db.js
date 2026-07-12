import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Disable mongoose command buffering so queries fail instantly when database is offline
    mongoose.set('bufferCommands', false);

    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/collabspace', {
      serverSelectionTimeoutMS: 2000, // Fail quickly (2s) if local server is offline
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    global.isMockDB = false;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.log('--- FALLING BACK TO IN-MEMORY MOCKUP DATABASE FOR LOCAL PREVIEW ---');
    global.isMockDB = true;
  }
};

export default connectDB;
