import mongoose from 'mongoose';

const artworkSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  medium: { type: String, required: true },
  imageUrl: { type: String, required: true },
  dimensions: { type: String, default: '' },
  price: { type: Number, default: 0 },
  visibility: { type: String, enum: ['public', 'private'], default: 'public' },
  artistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  artistName: { type: String, required: true },
  artistEmail: { type: String, required: true },
  artistPhoto: { type: String, default: '' },
  likes: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Artwork', artworkSchema);