
import mongoose from 'mongoose';

// שומרים את החיבור כדי שלא נפתח אותו מחדש בכל בקשה
let isConnected = false;

export const connectToDatabase = async () => {
  if (isConnected) {
    console.log('=> using existing database connection');
    return;
  }

  // שולף את סיסמת מסד הנתונים מ-Vercel
  const dbUri = process.env.MONGODB_URI;
  
  if (!dbUri) {
    throw new Error('🚨 חסר משתנה MONGODB_URI ב-Vercel');
  }

  try {
    const db = await mongoose.connect(dbUri);
    isConnected = db.connections[0].readyState === 1;
    console.log('=> database connected successfully');
  } catch (error) {
    console.error('=> database connection error:', error);
    throw error;
  }
};
