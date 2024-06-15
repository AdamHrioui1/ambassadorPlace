const mongoose = require('mongoose');

const PartnerSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    
    businessName: { type: String },
    contactName: { type: String },
    phone: { type: String, unique: false },
    country: { type: String },
    address: { type: String },
    businessType: { type: String },
    websiteUrl: { type: String },

    hotelPhotos: { type: Array, default: [] },
    restaurantPhotos: { type: Array, default: [] },
    activityPhotos: { type: Array, default: [] },

    businessDescription: { type: String },
    bio: { type: String },
    terms_and_conditions: { type: Boolean, default: true },
    
    referred_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambassador' },
    stepCompleted: { type: Number, default: 0 },
});

const Partner = mongoose.model('Partner', PartnerSchema);

module.exports = Partner;
