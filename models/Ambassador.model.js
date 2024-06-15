const mongoose = require('mongoose');

const AmbassadorSchema = new mongoose.Schema({
    firstName: { type: String },
    lastName: { type: String },
    dob: { type: Date },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true  },
    phone: { type: String, unique: false },
    country: { type: String },
    
    emailVerificationNumber: { type: Number },
    phoneVerificationNumber: { type: Number },

    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    
    idDocument: { type: Array }, // Contient l'ID GridFS du document d'identité
    selfie: { type: Array }, // Contient l'ID GridFS du selfie
    termsAccepted: { type: Boolean },

    stepCompleted: { type: Number, default: 0 },
    referred_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambassador' },
    referred_partners: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Partner' }],
    referred_ambassadors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ambassador' }],
});

const Ambassador = mongoose.model('Ambassador', AmbassadorSchema);

module.exports = Ambassador;