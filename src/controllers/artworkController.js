import Artwork from '../models/Artwork.js';
import Favorite from '../models/Favorite.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

export const getArtworks = async (req, res) => {
  try {
    const { page = 1, search = '', category = '', sort = 'newest' } = req.query;
    const limit = 12;
    const skip = (page - 1) * limit;
    
    let query = { visibility: 'public' };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { artistName: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    let sortOptions = {};
    switch (sort) {
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'most-liked':
        sortOptions = { likes: -1 };
        break;
      default:
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
};

export const getFeaturedArtworks = async (req, res) => {
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
};

export const getLatestArtworks = async (req, res) => {
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
};

export const getArtworkById = async (req, res) => {
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
};

export const getUserArtworks = async (req, res) => {
  try {
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
};

export const createArtwork = async (req, res) => {
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
};

export const updateArtwork = async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id);
    
    if (!artwork) {
      return res.status(404).json({ 
        success: false,
        message: 'Artwork not found' 
      });
    }

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
};

export const deleteArtwork = async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id);
    
    if (!artwork) {
      return res.status(404).json({ 
        success: false,
        message: 'Artwork not found' 
      });
    }

    if (artwork.artistId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }

    await Artwork.findByIdAndDelete(req.params.id);
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
};

export const likeArtwork = async (req, res) => {
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
      artwork.likes = Math.max(0, artwork.likes - 1);
      artwork.likedBy = artwork.likedBy.filter(
        likedUserId => likedUserId.toString() !== userId
      );
    } else {
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
};

export const seedDatabase = async (req, res) => {
  try {
    await Artwork.deleteMany({});
    await User.deleteMany({});
    await Favorite.deleteMany({});

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
};