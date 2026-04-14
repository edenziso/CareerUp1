import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, default: '' },
  domain: { type: String, default: '' },
  experience: { type: String, default: '' },
  skills: { type: [String], default: [] },
  xp: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// מוודא שהמודל לא נוצר פעמיים בטעות
export default mongoose.models.User || mongoose.model('User', UserSchema);
