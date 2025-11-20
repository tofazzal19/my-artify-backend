import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://SimpleDBUser:c9yW9DHUFuOy7wHi@cluster0.jflpcdt.mongodb.net/artify?tls=true&tlsAllowInvalidCertificates=trueretryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 10000,
}).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
});

// MongoDB Schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, default: '' },
  photoURL: { type: String, default: '' },
  googleId: { type: String, default: '' },
  githubId: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

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

const favoriteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  artworkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Artwork', required: true },
  createdAt: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', userSchema);
const Artwork = mongoose.model('Artwork', artworkSchema);
const Favorite = mongoose.model('Favorite', favoriteSchema);

// JWT Secret
const JWT_SECRET = 'e78067192c74487853498fc13cf20a1ebfd56a7c7609cec37e64501783357d7243ac7201f2f8c7073fb2c7d61b0048b1c8bb049bced5d5986f36800e8a28e4dc';

// Auth Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'No token, authorization denied' 
      });
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'No token, authorization denied' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    req.user = user;
    req.user.id = user._id.toString();
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired' 
      });
    }
    res.status(401).json({ 
      success: false,
      message: 'Token is not valid' 
    });
  }
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'Server is running!',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// Public routes - no auth required
app.get('/api/artworks', async (req, res) => {
  try {
    const { page = 1, search = '', category = '', sort = 'newest' } = req.query;
    const limit = 12;
    const skip = (page - 1) * limit;
    
    let query = { visibility: 'public' };
    
    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { artistName: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Category filter
    if (category) {
      query.category = category;
    }
    
    // Sort functionality
    let sortOptions = {};
    switch (sort) {
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'most-liked':
        sortOptions = { likes: -1 };
        break;
      default: // newest
        sortOptions = { createdAt: -1 };
    }
    
    const artworks = await Artwork.find(query)
      .populate('artistId', 'name email photoURL')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);
    
    res.json({ 
      success: true,
      artworks 
    });
  } catch (error) {
    console.error('Get artworks error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching artworks' 
    });
  }
});

app.get('/api/artworks/featured', async (req, res) => {
  try {
    const artworks = await Artwork.find({ visibility: 'public' })
      .populate('artistId', 'name email photoURL')
      .sort({ likes: -1, createdAt: -1 })
      .limit(6);
    
    res.json({ 
      success: true,
      artworks 
    });
  } catch (error) {
    console.error('Get featured artworks error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching featured artworks' 
    });
  }
});

app.get('/api/artworks/latest', async (req, res) => {
  try {
    const artworks = await Artwork.find({ visibility: 'public' })
      .populate('artistId', 'name email photoURL')
      .sort({ createdAt: -1 })
      .limit(6);
    
    res.json({ 
      success: true,
      artworks 
    });
  } catch (error) {
    console.error('Get latest artworks error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching latest artworks' 
    });
  }
});

app.get('/api/artworks/:id', async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id)
      .populate('artistId', 'name email photoURL');
    
    if (!artwork) {
      return res.status(404).json({ 
        success: false,
        message: 'Artwork not found' 
      });
    }
    
    res.json({ 
      success: true,
      artwork 
    });
  } catch (error) {
    console.error('Get artwork error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching artwork' 
    });
  }
});

// Mock Social Login endpoint
app.post('/api/auth/mock-social', async (req, res) => {
  try {
    const { provider } = req.body;
    
    if (!provider) {
      return res.status(400).json({
        success: false,
        message: 'Provider is required'
      });
    }

    // Create unique email based on provider
    const email = `${provider}_user_${Date.now()}@artify.com`;
    const name = `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`;
    
    // Check if user exists
    let user = await User.findOne({ email });
    
    if (!user) {
      user = new User({
        name,
        email,
        photoURL: `https://i.ibb.co.com/WNjkBs1C/Myprof.png`,
        [`${provider}Id`]: `mock_${provider}_${Date.now()}`
      });
      await user.save();
    }

    // Create JWT token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL
      },
      token
    });

  } catch (error) {
    console.error('Mock social login error:', error);
    res.status(500).json({
      success: false,
      message: 'Social login failed'
    });
  }
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, photoURL } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Name, email, and password are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters' 
      });
    }

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ 
        success: false,
        message: 'User already exists with this email' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    user = new User({
      name,
      email,
      password: hashedPassword,
      photoURL: photoURL || ''
    });

    await user.save();

    // Create token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during registration' 
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    // Create token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during login' 
    });
  }
});

// PROTECTED ROUTES - require auth

// Get user's artworks
app.get('/api/artworks/user/:userId', authMiddleware, async (req, res) => {
  try {
    // Verify the user is accessing their own data
    if (req.params.userId !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    const artworks = await Artwork.find({ artistId: req.params.userId })
      .sort({ createdAt: -1 });
    
    res.json({ 
      success: true,
      artworks 
    });
  } catch (error) {
    console.error('Get user artworks error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching user artworks' 
    });
  }
});

// Add artwork
app.post('/api/artworks', authMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      medium,
      imageUrl,
      dimensions,
      price,
      visibility
    } = req.body;

    // Validation
    if (!title || !description || !category || !medium || !imageUrl) {
      return res.status(400).json({ 
        success: false,
        message: 'All required fields must be filled' 
      });
    }

    const artwork = new Artwork({
      title,
      description,
      category,
      medium,
      imageUrl,
      dimensions: dimensions || '',
      price: price ? Number(price) : 0,
      visibility: visibility || 'public',
      artistId: req.user._id,
      artistName: req.user.name,
      artistEmail: req.user.email,
      artistPhoto: req.user.photoURL
    });

    await artwork.save();
    
    const populatedArtwork = await Artwork.findById(artwork._id)
      .populate('artistId', 'name email photoURL');
    
    res.status(201).json({ 
      success: true,
      artwork: populatedArtwork,
      message: 'Artwork created successfully!'
    });
  } catch (error) {
    console.error('Create artwork error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error creating artwork: ' + error.message 
    });
  }
});

// Update artwork
app.put('/api/artworks/:id', authMiddleware, async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id);
    
    if (!artwork) {
      return res.status(404).json({ 
        success: false,
        message: 'Artwork not found' 
      });
    }

    // Check if user owns the artwork
    if (artwork.artistId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    const updatedArtwork = await Artwork.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    ).populate('artistId', 'name email photoURL');

    res.json({ 
      success: true,
      artwork: updatedArtwork,
      message: 'Artwork updated successfully!'
    });
  } catch (error) {
    console.error('Update artwork error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating artwork' 
    });
  }
});

// Delete artwork
app.delete('/api/artworks/:id', authMiddleware, async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id);
    
    if (!artwork) {
      return res.status(404).json({ 
        success: false,
        message: 'Artwork not found' 
      });
    }

    // Check if user owns the artwork
    if (artwork.artistId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    await Artwork.findByIdAndDelete(req.params.id);
    
    // Remove from favorites
    await Favorite.deleteMany({ artworkId: req.params.id });
    
    res.json({ 
      success: true,
      message: 'Artwork deleted successfully!' 
    });
  } catch (error) {
    console.error('Delete artwork error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting artwork' 
    });
  }
});

// Like artwork
app.post('/api/artworks/:id/like', authMiddleware, async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id);
    
    if (!artwork) {
      return res.status(404).json({ 
        success: false,
        message: 'Artwork not found' 
      });
    }

    const userId = req.user._id.toString();
    const hasLiked = artwork.likedBy.includes(userId);
    
    if (hasLiked) {
      // Unlike
      artwork.likes = Math.max(0, artwork.likes - 1);
      artwork.likedBy = artwork.likedBy.filter(
        likedUserId => likedUserId.toString() !== userId
      );
    } else {
      // Like
      artwork.likes += 1;
      artwork.likedBy.push(req.user._id);
    }

    await artwork.save();

    res.json({
      success: true,
      isLiked: !hasLiked,
      likesCount: artwork.likes,
      message: hasLiked ? 'Artwork unliked' : 'Artwork liked!'
    });
  } catch (error) {
    console.error('Like artwork error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error liking artwork: ' + error.message 
    });
  }
});

// Favorites Routes
app.get('/api/favorites/:userId', authMiddleware, async (req, res) => {
  try {
    // Verify the user is accessing their own data
    if (req.params.userId !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    const favorites = await Favorite.find({ userId: req.user._id })
      .populate({
        path: 'artworkId',
        populate: {
          path: 'artistId',
          select: 'name email photoURL'
        }
      })
      .sort({ createdAt: -1 });
    
    // Extract just the artwork objects and filter out nulls
    const favoriteArtworks = favorites
      .map(fav => fav.artworkId)
      .filter(artwork => artwork !== null);
    
    res.json({ 
      success: true,
      favorites: favoriteArtworks 
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching favorites' 
    });
  }
});

// Check if artwork is favorited
app.get('/api/favorites/check/:artworkId', authMiddleware, async (req, res) => {
  try {
    const existingFavorite = await Favorite.findOne({
      userId: req.user._id,
      artworkId: req.params.artworkId
    });

    res.json({ 
      success: true,
      isFavorited: !!existingFavorite 
    });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error checking favorite' 
    });
  }
});

app.post('/api/favorites', authMiddleware, async (req, res) => {
  try {
    const { artworkId } = req.body;

    if (!artworkId) {
      return res.status(400).json({ 
        success: false,
        message: 'Artwork ID is required' 
      });
    }

    // Check if artwork exists
    const artwork = await Artwork.findById(artworkId);
    if (!artwork) {
      return res.status(404).json({ 
        success: false,
        message: 'Artwork not found' 
      });
    }

    // Check if already favorited
    const existingFavorite = await Favorite.findOne({
      userId: req.user._id,
      artworkId
    });

    if (existingFavorite) {
      return res.status(200).json({
        success: true,
        message: 'Already in favorites' 
      });
    }

    const favorite = new Favorite({
      userId: req.user._id,
      artworkId
    });

    await favorite.save();
    
    res.status(201).json({ 
      success: true,
      message: 'Added to favorites!' 
    });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error adding to favorites: ' + error.message 
    });
  }
});

app.delete('/api/favorites/:artworkId', authMiddleware, async (req, res) => {
  try {
    const result = await Favorite.findOneAndDelete({
      userId: req.user._id,
      artworkId: req.params.artworkId
    });

    if (!result) {
      return res.status(404).json({ 
        success: false,
        message: 'Favorite not found' 
      });
    }

    res.json({ 
      success: true,
      message: 'Removed from favorites' 
    });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error removing from favorites' 
    });
  }
});

// Seed initial data
app.post('/api/seed', async (req, res) => {
  try {
    // Clear existing data
    await Artwork.deleteMany({});
    await User.deleteMany({});
    await Favorite.deleteMany({});

    // Create sample users
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Password123', salt);

    const users = [
      {
        name: 'Demo User',
        email: 'demo@artify.com',
        password: hashedPassword,
        photoURL: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah@artify.com',
        password: hashedPassword,
        photoURL: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
      },
      {
        name: 'Mike Chen',
        email: 'mike@artify.com',
        password: hashedPassword,
        photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
      }
    ];

    const createdUsers = await User.insertMany(users);

    // Create sample artworks with HD images
    const sampleArtworks = [
      {
        title: "Nature's Whisper",
        description: "A beautiful charcoal drawing capturing the essence of nature with intricate details and textures that bring the forest to life.",
        category: "Drawing",
        medium: "Charcoal on Paper",
        imageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=1200&h=800&fit=crop",
        price: 620,
        artistId: createdUsers[0]._id,
        artistName: createdUsers[0].name,
        artistEmail: createdUsers[0].email,
        artistPhoto: createdUsers[0].photoURL,
        likes: 29,
        likedBy: [createdUsers[1]._id, createdUsers[2]._id]
      },
      {
        title: "Abstract Emotions",
        description: "An expressive mixed media piece exploring emotional depth through vibrant colors and dynamic brushstrokes.",
        category: "Mixed Media",
        medium: "Acrylic & Ink on Canvas",
        imageUrl: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1200&h=800&fit=crop",
        price: 890,
        artistId: createdUsers[1]._id,
        artistName: createdUsers[1].name,
        artistEmail: createdUsers[1].email,
        artistPhoto: createdUsers[1].photoURL,
        likes: 51,
        likedBy: [createdUsers[0]._id, createdUsers[2]._id]
      },
      {
        title: "Urban Dreams",
        description: "A digital artwork depicting the dreams of city life with futuristic architecture and neon-lit streets.",
        category: "Digital Art",
        medium: "Digital Illustration",
        imageUrl: "https://images.unsplash.com/photo-1574169208507-84376144848b?w=1200&h=800&fit=crop",
        price: 450,
        artistId: createdUsers[2]._id,
        artistName: createdUsers[2].name,
        artistEmail: createdUsers[2].email,
        artistPhoto: createdUsers[2].photoURL,
        likes: 42,
        likedBy: [createdUsers[0]._id, createdUsers[1]._id]
      },
      {
        title: "Ocean Serenity",
        description: "A stunning oil painting capturing the peaceful moments of ocean waves at sunset.",
        category: "Painting",
        medium: "Oil on Canvas",
        imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=800&fit=crop",
        price: 1200,
        artistId: createdUsers[0]._id,
        artistName: createdUsers[0].name,
        artistEmail: createdUsers[0].email,
        artistPhoto: createdUsers[0].photoURL,
        likes: 67,
        likedBy: [createdUsers[1]._id, createdUsers[2]._id]
      },
      {
        title: "Mountain Majesty",
        description: "A breathtaking landscape photograph of majestic mountains during golden hour.",
        category: "Photography",
        medium: "Digital Photography",
        imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=800&fit=crop",
        price: 350,
        artistId: createdUsers[1]._id,
        artistName: createdUsers[1].name,
        artistEmail: createdUsers[1].email,
        artistPhoto: createdUsers[1].photoURL,
        likes: 88,
        likedBy: [createdUsers[0]._id, createdUsers[2]._id]
      }
    ];

    const artworks = await Artwork.insertMany(sampleArtworks);

    // Create some favorites
    const favorites = [
      {
        userId: createdUsers[0]._id,
        artworkId: artworks[1]._id
      },
      {
        userId: createdUsers[0]._id,
        artworkId: artworks[2]._id
      },
      {
        userId: createdUsers[1]._id,
        artworkId: artworks[0]._id
      }
    ];

    await Favorite.insertMany(favorites);

    res.json({ 
      success: true,
      message: 'Database seeded successfully!',
      users: createdUsers.map(user => ({
        id: user._id,
        email: user.email,
        password: 'Password123'
      })),
      artworks: artworks.length,
      favorites: favorites.length
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error seeding database' 
    });
  }
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}/api`);
  console.log(`❤️  Health: http://localhost:${PORT}/api/health`);
  console.log(`🌱 Seed: POST http://localhost:${PORT}/api/seed`);
  console.log(`\n📝 Demo Credentials:`);
  console.log(`   Email: demo@artify.com`);
  console.log(`   Password: Password123`);
});