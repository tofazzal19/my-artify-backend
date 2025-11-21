import Favorite from '../models/Favorite.js';
import Artwork from '../models/Artwork.js';

export const getFavorites = async (req, res) => {
  try {
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
};

export const checkFavorite = async (req, res) => {
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
};

export const addFavorite = async (req, res) => {
  try {
    const { artworkId } = req.body;

    if (!artworkId) {
      return res.status(400).json({ 
        success: false,
        message: 'Artwork ID is required' 
      });
    }

    const artwork = await Artwork.findById(artworkId);
    if (!artwork) {
      return res.status(404).json({ 
        success: false,
        message: 'Artwork not found' 
      });
    }

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
};

export const removeFavorite = async (req, res) => {
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
};