import { Schema, model } from 'mongoose';

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Hashlenmiş şifre
  createdAt: { type: Date, default: Date.now }
});

export const User = model('User', UserSchema);