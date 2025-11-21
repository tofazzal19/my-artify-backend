import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  artworkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Artwork', required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Favorite', favoriteSchema);