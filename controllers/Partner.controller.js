const validator = require('validator');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const cloudinary = require('cloudinary');
const Partner = require('../models/partner.model');
const Ambassador = require('../models/Ambassador.model');
const fs = require('fs');
// const ConfirmationMail = require('../nodemailer/ConfirmationMail');
const sendConfirmationEmail = require('../nodemailer/ConfirmationMail.js')

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET 
})

const PartnerCtrl = {
    register: async (req, res) => {
        try {
            const { email, password } = req.body
            let { ambassador_referrer } = req.query
            
            if(!validator.isEmail(email)) return res.status(400).json({ success: false, message: 'Please enter a valid email!'}) 
            if(password === undefined || password.length < 6) return res.status(400).json({ success: false, message: 'Please enter a password at least 6 characters!'}) 
            
            const emailExist = await Partner.findOne({ email })
            if(emailExist) return res.status(400).json({ success: false, message: 'This email is already token. Please choose another one!'})
            
            const salt = 10
            const hashedPassword = await bcrypt.hash(password, salt)
            const newPartner = new Partner({
                email, password: hashedPassword
            })

            await newPartner.save()
            const accessToken = createAccessToken({ id: newPartner._id })
            const refreshtoken = createRefreshToken({ id: newPartner._id })

            res.cookie('refreshtoken', refreshtoken, {
                httpOnly: true,
                path: '/api/partner/refreshtoken'
            })

            if(ambassador_referrer) {
                let ambassadorReferrerExist = await Ambassador.findById({ _id: ambassador_referrer })
                if(ambassadorReferrerExist) {
                    let partnerAlreadyExist = ambassadorReferrerExist.referred_partners.includes(newPartner._id)
                    if(!partnerAlreadyExist) {
                        ambassadorReferrerExist.referred_partners.push(newPartner._id)
                    }
                    await ambassadorReferrerExist.save()

                    newPartner.referred_by = ambassadorReferrerExist._id
                    await newPartner.save()
                }
            }
            
            return res.status(200).json({ success: true, data: { newPartner, accessToken} })
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message })
        }
    },
    login: async (req, res) => {
        try {
            const { email, password } = req.body

            if(!validator.isEmail(email)) return res.status(400).json({ success: false, message: 'Please enter a valid email!'}) 
            const partner = await Partner.findOne({ email })
            if(!partner) return res.status(400).json({ success: false, message: 'Email not found!!' })
            if(password.length < 6) return res.status(400).json({ success: false, message: 'Please enter a password at least 6 characters!'}) 
            
            const isMatch = await bcrypt.compare(password, partner.password)
            if(!isMatch) return res.status(400).json({ success: false, message: 'Incorrect password!!' })

            const accesstoken = createAccessToken({ id: partner._id })
            const refreshtoken = createRefreshToken({ id: partner._id })

            res.cookie('refreshtoken', refreshtoken, {
                httpOnly: true,
                path: '/api/partner/refreshtoken'
            })

            return res.status(200).json({ success: true, data: accesstoken })
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message })
        }
    },
    refreshtoken: async (req, res) => {
        try {
            const token = req.cookies.refreshtoken
            if(!token) return res.status(400).json({ success: false, message: 'Invalid Authentication!' })
            jwt.verify(token, process.env.PARTNER_REFRESH_TOKEN_SECRET, (err, user) => {
                if(err) return res.status(400).json({ success: false, message: 'Invalid Authentication!'})

                const accesstoken = createAccessToken({ id: user.id })
                return res.status(200).json({ success: true, data: accesstoken })
            })
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message })
        }
    },
    logout: async (req, res) => {
        try {
            res.clearCookie('refreshtoken', { path: '/api/partner/refreshtoken' })
            res.status(200).json({ success: true, message: 'Logout successfult!' })
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message })
        }
    },

    step1: async (req, res) => {
        try {
            let { businessName, contactName, country, phone, address, businessType, websiteUrl } = req.body

            let partnerExist = await Partner.findById({ _id: req.user.id })
            if(!partnerExist) return res.status(400).json({ success: false, message: 'partner not found' })

            if(businessName === undefined || businessName.length === 0) return res.status(400).json({ success: false, message: 'Please enter your business name' })
            if(contactName === undefined || contactName.length === 0) return res.status(400).json({ success: false, message: 'Please enter your contact name' })
            if(country === undefined || country.length === 0) return res.status(400).json({ success: false, message: 'Please enter your country' })
            if(phone === undefined || phone.length === 0) return res.status(400).json({ success: false, message: 'Please enter your phone number' })
            if(phone.length <= 9) return res.status(400).json({ success: false, message: 'Please enter a valid phone number' })        
            if(address === undefined || address.length === 0) return res.status(400).json({ success: false, message: 'Please enter your address' })
            if(businessType === undefined || businessType.length === 0) return res.status(400).json({ success: false, message: 'Please enter your business type' })
            if(websiteUrl === undefined || websiteUrl.length === 0) return res.status(400).json({ success: false, message: 'Please enter your website url' })

            let partner = await Partner.findByIdAndUpdate({ _id: req.user.id }, {
                businessName,
                contactName,
                country,
                phone,
                address,
                businessType,
                websiteUrl,
                stepCompleted: partnerExist.stepCompleted <= 1 ? 1 : partnerExist.stepCompleted,
            })
            
            return res.status(200).json({ success: true, data: { partner, message: 'Step 1 completed successfuly!'} })
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message })
        }
    },

    step2: async (req, res) => {
        try {
            let partnerExist = await Partner.findById({ _id: req.user.id })
            if(!partnerExist) return res.status(400).json({ success: false, message: 'partner not found' })

            let files = await fileUploadHandler(req, res, 'hotel_photos')

            partnerExist.hotelPhotos.push(...files)
            if(partnerExist.stepCompleted <= 2) {
                partnerExist.stepCompleted = 2
            } else {
                partnerExist.stepCompleted = partnerExist.stepCompleted
            }      
            await partnerExist.save()

            return res.status(200).json({ success: true, data: { files, partner: partnerExist, message: 'Step 2 completed successfuly!' }})
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message })
        }
    },

    step3: async (req, res) => {
        try {
            let partnerExist = await Partner.findById({ _id: req.user.id })
            if(!partnerExist) return res.status(400).json({ success: false, message: 'partner not found' })

            let files = await fileUploadHandler(req, res, 'menu_photos')

            partnerExist.restaurantPhotos.push(...files)
            if(partnerExist.stepCompleted <= 3) {
                partnerExist.stepCompleted = 3
            } else {
                partnerExist.stepCompleted = partnerExist.stepCompleted
            }
            await partnerExist.save()

            return res.status(200).json({ success: true, data: { files, partner: partnerExist, message: 'Step 3 completed successfuly!' }})
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message })
        }
    },

    step4: async (req, res) => {
        try {
            let partnerExist = await Partner.findById({ _id: req.user.id })
            if(!partnerExist) return res.status(400).json({ success: false, message: 'partner not found' })

            let files = await fileUploadHandler(req, res, 'activity_photos')
            partnerExist.activityPhotos.push(...files)

            if(partnerExist.stepCompleted <= 4) {
                partnerExist.stepCompleted = 4
            } else {
                partnerExist.stepCompleted = partnerExist.stepCompleted
            }
            await partnerExist.save()

            return res.status(200).json({ success: true, data: { files, partner: partnerExist, message: 'Step 4 completed successfuly!' }})
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message })
        }
    },

    step5: async (req, res) => {
        try {
            let { businessDescription } = req.body
            
            let partnerExist = await Partner.findById({ _id: req.user.id })
            if(!partnerExist) return res.status(400).json({ success: false, message: 'partner not found' })
            if(businessDescription === undefined || businessDescription.length === 0) return res.status(400).json({ success: false, message: 'Please enter your business description' })

            let partner = await Partner.findByIdAndUpdate({ _id: req.user.id }, {
                businessDescription,
                stepCompleted: partnerExist.stepCompleted <= 5 ? 5 : partnerExist.stepCompleted,
            })

            return res.status(200).json({ success: true, data: { partner, message: 'Step 5 completed successfuly!'} })
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message })
        }
    },

    step6: async (req, res) => {
        try {
            let { bio } = req.body
            
            let partnerExist = await Partner.findById({ _id: req.user.id })
            if(!partnerExist) return res.status(400).json({ success: false, message: 'partner not found' })
            if(bio === undefined || bio.length === 0) return res.status(400).json({ success: false, message: 'Please enter your bio' })

            let partner = await Partner.findByIdAndUpdate({ _id: req.user.id }, {
                bio,
                stepCompleted: partnerExist.stepCompleted <= 6 ? 6 : partnerExist.stepCompleted,
            })

            return res.status(200).json({ success: true, data: { partner, message: 'Step 6 completed successfuly!'} })            
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message })
        }
    },

    step7: async (req, res) => {
        try {
            let { terms_and_conditions } = req.body
            
            let partnerExist = await Partner.findById({ _id: req.user.id })
            if(!partnerExist) return res.status(400).json({ success: false, message: 'partner not found' })
            if(terms_and_conditions === undefined || terms_and_conditions.length === 0) return res.status(400).json({ success: false, message: 'Accept the terms and conditions' })

            let partner = await Partner.findByIdAndUpdate({ _id: req.user.id }, {
                terms_and_conditions,
                stepCompleted: partnerExist.stepCompleted <= 7 ? 7 : partnerExist.stepCompleted,
            })

            // await ConfirmationMail('partner', partnerExist?.email, '', '')
            await sendConfirmationEmail('partner', partnerExist?.email, '', '')

            return res.status(200).json({ success: true, data: { partner, message: 'Step 7 completed successfuly!'} })            
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message })
        }
    },

    partner_info: async (req, res) => {
        try {
            let partner = await Partner.findById({ _id: req.user.id }).select('-password')
            if(!partner) return res.status(400).json({ success: false, message: 'partner not found' })

            return res.status(200).json({ success: true, data: { partner } })            
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message })
        }
    },

    removePhoto: async (req, res) => {
        try {
            const { public_id, key } = req.body

            let partner = await Partner.findById({ _id: req.user.id }).select('-password')
            if(!partner) return res.status(400).json({ success: false, message: 'partner not found' })    
            if(!public_id) return res.status(400).json({ msg: "No file selected!" })
    
            let filtredArray = partner[key].filter(img => img.public_id !== public_id)
            partner[key] = filtredArray
            await partner.save()

            cloudinary.v2.uploader.destroy(public_id, (error, result) => {
                if(error) throw error
    
                return res.status(200).json({ success: true, data: { partner, message: "File deleted successfuly!"} })
            })
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message })
        }
    }
}

let fileUploadHandler = async (req, res, file_name) => {
    try {
        const { files } = req.files

        if(!req.files || files.length === 0 || Object.keys(files).length === 0 || files === null) return res.status(400).json({ msg: "No file uploaded!" })

        var filesSize = 0
        if(files.length === undefined && Object.keys(files).length !== 0) {
            if(files.size > 30 * 1024 * 1024) {
                removeTempFile(files.tempFilePath)
                return res.status(400).json({ msg: 'Maximum size is 30MB!' })
            }
            
            if(files.mimetype !== 'image/png' && files.mimetype !== 'image/jpeg' && files.mimetype !== 'image/jpg' && files.mimetype !== 'image/webp' && files.mimetype !== 'application/pdf') {
                removeTempFile(files.tempFilePath)
                return res.status(400).json({ msg: 'File type not supported!' })
            }

            cloudinary.v2.uploader.upload(files.tempFilePath, { folder: file_name }, (err, result) => {
                removeTempFile(files.tempFilePath)
                if(err) throw err

                return [
                    {
                        public_id: result.public_id,
                        secure_url: result.secure_url
                    }
                ]
            })
        }
        else {            
            files.forEach(f => {
                filesSize += f.size
            });

            if(filesSize > 30 * 1024 * 1024) return res.status(400).json({ msg: "Maximum size is 30MB!" })

            var matchedFiles = []
            matchedFiles.forEach(f => {
                tempfilesPaths.push(f.tempFilePath)
                // removeTempFile(f.tempFilePath)
            })

            files.forEach(f => {
                if(f.mimetype === 'image/png' || f.mimetype === 'image/jpeg' || f.mimetype === 'image/jpg' || f.mimetype === 'image/webp' || f.mimetype === 'application/pdf') {
                    matchedFiles.push(f)
                }
                // removeTempFile(f.tempFilePath)
            })

            var uploadedFiles = [] 
            const uploader = async (path) => await cloudinary.v2.uploader.upload(path, { folder: file_name });

            for (const file of matchedFiles) {
                const respons = await uploader(file.tempFilePath)
                uploadedFiles.push({
                    public_id: respons.public_id,
                    secure_url: respons.secure_url
                })
            }

            files.forEach(f => {
                removeTempFile(f.tempFilePath)
            })

            return uploadedFiles;    
        }
    } catch (err) {
        console.log(err)
        return res.status(500).json({ msg: err.message })
    }
}

const removeTempFile = (path) => {
    fs.unlink(path, err => {
        if(err) throw err
    })
}

const createAccessToken = (id) => {
    return jwt.sign(id, process.env.PARTNER_ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
}

const createRefreshToken = (id) => {
    return jwt.sign(id, process.env.PARTNER_REFRESH_TOKEN_SECRET, { expiresIn: '7d' })
}

module.exports = PartnerCtrl