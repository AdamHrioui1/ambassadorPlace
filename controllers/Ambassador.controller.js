const validator = require('validator');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const Ambassador = require('../models/Ambassador.model');
const SendMail = require('../nodemailer/SendMail-v0.js');
const cloudinary = require('cloudinary');
const fs = require('fs');
// const ConfirmationMail = require('../nodemailer/ConfirmationMail')
const sendConfirmationEmail = require('../nodemailer/ConfirmationMail.js')

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET 
})

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

const AmbassadorCtrl = {
    register: async (req, res) => {
        try {
            const { email, password } = req.body
            let { ambassador_referrer } = req.query
            
            if(!validator.isEmail(email)) return res.status(400).json({ success: false, message: 'Please enter a valid email!'}) 
            if(password === undefined || password.length < 6) return res.status(400).json({ success: false, message: 'Please enter a password at least 6 characters!'}) 
            
            const emailExist = await Ambassador.findOne({ email })
            if(emailExist) return res.status(400).json({ success: false, message: 'This email is already token. Please choose another one!'})
            
            const salt = 10
            const hashedPassword = await bcrypt.hash(password, salt)
            const newAmbassador = new Ambassador({
                email, password: hashedPassword
            })

            await newAmbassador.save()
            const accessToken = createAccessToken({ id: newAmbassador._id })
            const refreshtoken = createRefreshToken({ id: newAmbassador._id })

            res.cookie('refreshtoken', refreshtoken, {
                httpOnly: true,
                path: '/api/ambassador/refreshtoken'
            })

            if(ambassador_referrer) {
                let ambassadorReferrerExist = await Ambassador.findById({ _id: ambassador_referrer })
                if(ambassadorReferrerExist) {
                    let ambassadorAlreadyExist = ambassadorReferrerExist.referred_ambassadors.includes(newAmbassador._id)
                    if(!ambassadorAlreadyExist) {
                        ambassadorReferrerExist.referred_ambassadors.push(newAmbassador._id)
                    }
                    await ambassadorReferrerExist.save()

                    newAmbassador.referred_by = ambassadorReferrerExist._id
                    await newAmbassador.save()
                }
            }

            return res.status(200).json({ success: true, data: { newAmbassador, accessToken} })
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message })
        }
    },
    login: async (req, res) => {
        try {
            const { email, password } = req.body

            if(!validator.isEmail(email)) return res.status(400).json({ success: false, message: 'Please enter a valid email!'}) 
            const ambassador = await Ambassador.findOne({ email })
            if(!ambassador) return res.status(400).json({ success: false, message: 'Email not found!!' })
            if(password.length < 6) return res.status(400).json({ success: false, message: 'Please enter a password at least 6 characters!'}) 
            
            const isMatch = await bcrypt.compare(password, ambassador.password)
            if(!isMatch) return res.status(400).json({ success: false, message: 'Incorrect password!!' })

            const accesstoken = createAccessToken({ id: ambassador._id })
            const refreshtoken = createRefreshToken({ id: ambassador._id })

            res.cookie('refreshtoken', refreshtoken, {
                httpOnly: true,
                path: '/api/ambassador/refreshtoken'
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
            jwt.verify(token, process.env.AMBASSADOR_REFRESH_TOKEN_SECRET, (err, user) => {
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
            res.clearCookie('refreshtoken', { path: '/api/ambassador/refreshtoken' })
            res.status(200).json('Logout successfult!')
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message })
        }
    },

    step1: async (req, res) => {
        try {
            let { firstName, lastName, phone, dob, country } = req.body

            let ambassadorExist = await Ambassador.findById({ _id: req.user.id })
            if(!ambassadorExist) return res.status(400).json({ success: false, message: 'ambassador not found' })

            if(firstName === undefined || firstName.length === 0) return res.status(400).json({ success: false, message: 'Please enter your first name' })
            if(lastName === undefined || lastName.length === 0) return res.status(400).json({ success: false, message: 'Please enter your last name' })
            if(phone === undefined || phone.length === 0) return res.status(400).json({ success: false, message: 'Please enter your phone number' })
            if(phone.length <= 9) return res.status(400).json({ success: false, message: 'Please enter a valid phone number' })
            if(dob === undefined || dob.length === 0) return res.status(400).json({ success: false, message: 'Please enter your date of birth' })
            if(country === undefined || country.length === 0) return res.status(400).json({ success: false, message: 'Please enter your country' })                

            let emailVerificationNumber = Math.floor(Math.random() * 999999 + 1)
            let phoneVerificationNumber = Math.floor(Math.random() * 999999 + 1)

            let ambassadorInfos = {
                firstName,
                lastName,
                phone,
                dob,
                country,
                emailVerificationNumber: emailVerificationNumber,
                phoneVerificationNumber: phoneVerificationNumber,
                stepCompleted: ambassadorExist.stepCompleted <= 1 ? 1 : ambassadorExist.stepCompleted,
            }
            let ambassador = await Ambassador.findByIdAndUpdate({ _id: req.user.id }, ambassadorInfos)

            // SendMail('verify', ambassadorExist.email, emailVerificationNumber)
            SendMail('verify', ambassadorExist.email, emailVerificationNumber)
            
            // send code to phone number
            // await client.messages
            // .create({ 
            //     body: `Your nomad Verification number is: ${phoneVerificationNumber}`, 
            //     from: process.env.TWILIO_PHONE_NUMBER, 
            //     to: ambassadorExist?.phone
            // })
            // .then(message => console.log(message.sid));

            // send code to whatsapp number
            // await client.messages
            // .create({
            //     body: `Your nomad Verification number is: ${phoneVerificationNumber}`,
            //     from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
            //     to: `whatsapp:${ambassadorExist?.phone}`
            // })
            // .then(message => console.log(message.sid))
            
            return res.status(200).json({ success: true, data: { ambassador, message: 'Step 1 completed successfuly!'} })
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message })
        }
    },

    resend_phone_code: async (req, res) => {
        try {
            let ambassadorExist = await Ambassador.findById({ _id: req.user.id })
            if(!ambassadorExist) return res.status(400).json({ success: false, message: 'ambassador not found' })

            let phoneVerificationNumber = Math.floor(Math.random() * 999999 + 1)
            let ambassador = await Ambassador.findByIdAndUpdate({ _id: req.user.id }, {
                phoneVerificationNumber: phoneVerificationNumber
            })

            // send code to phone number
            // await client.messages
            // .create({ 
            //     body: `Your nomad Verification number is: ${phoneVerificationNumber}`, 
            //     from: process.env.TWILIO_PHONE_NUMBER, 
            //     to: ambassadorExist?.phone
            // })
            // .then(message => console.log(message.sid));

            // send code to whatsapp number
            // let whatsapp = await client.messages
            // .create({
            //     body: `Your nomad Verification number is: ${phoneVerificationNumber}`,
            //     from: 'whatsapp:+14155238886',
            //     to: `whatsapp:+212639978540`
            // })
            // .then(message => console.log(message.sid))

            // console.log('whatsapp: ', whatsapp)
            
            return res.status(200).json({ success: true, data: { ambassador, message: 'Resend phone code successfuly!'} })
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message })
        }
    },

    step2_verify_email: async (req, res) => {
        try {
            let { emailVerificationNumber } = req.body
            let ambassador = await Ambassador.findById({ _id: req.user.id })

            if(emailVerificationNumber === undefined || emailVerificationNumber.length === 0) return res.status(400).json({ success: false, message: 'Please enter your email verification number' })
            if(ambassador.emailVerificationNumber !== parseInt(emailVerificationNumber)) return res.status(400).json({ success: false, message: 'email verification number is not correct!' })
            
            ambassador.emailVerified = true
            ambassador.stepCompleted = ambassador.stepCompleted <= 2 ? 2 : ambassador.stepCompleted,
            await ambassador.save()

            return res.status(200).json({ success: true, data: { ambassador, message: 'Step 2: email verified successfuly!' }})
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message })
        }
    },

    step2_verify_phone: async (req, res) => {
        try {
            let { phoneVerificationNumber } = req.body
            let ambassador = await Ambassador.findById({ _id: req.user.id })

            if(phoneVerificationNumber === undefined || phoneVerificationNumber.length === 0) return res.status(400).json({ success: false, message: 'Please enter your phone verification number' })
            if(ambassador.phoneVerificationNumber !== parseInt(phoneVerificationNumber)) return res.status(400).json({ success: false, message: 'phone verification number is not correct!' })
            
            ambassador.phoneVerified = true
            ambassador.stepCompleted = ambassador.stepCompleted <= 2 ? 2 : ambassador.stepCompleted,
            await ambassador.save()

            return res.status(200).json({ success: true, data: { ambassador, message: 'Step 3: phone verified successfuly!' }})
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message })
        }
    },

    step3_passport_or_nationalId: async (req, res) => {
        try {
            let ambassadorExist = await Ambassador.findById({ _id: req.user.id })
            if(!ambassadorExist) return res.status(400).json({ success: false, message: 'ambassador not found' })

            let files = await fileUploadHandler(req, res, 'passports_and_nationalIds')
            
            if (!Array.isArray(files)) {
                files = [files];
            }

            ambassadorExist.idDocument.push(...files)
            if(ambassadorExist.stepCompleted <= 3) {
                ambassadorExist.stepCompleted = 3
            } else {
                ambassadorExist.stepCompleted = ambassadorExist.stepCompleted
            }
            await ambassadorExist.save()

            return res.status(200).json({ success: true, data: { files, ambassador: ambassadorExist, message: 'Step 4 completed successfuly!' }})
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message })
        }
    },

    step4_photo: async (req, res) => {
        try {
            let ambassadorExist = await Ambassador.findById({ _id: req.user.id })
            if(!ambassadorExist) return res.status(400).json({ success: false, message: 'ambassador not found' })

            let files = await fileUploadHandler(req, res, 'selfie')
            
            if (!Array.isArray(files)) {
                files = [files];
            }

            ambassadorExist.selfie.push(...files)
            if(ambassadorExist.stepCompleted <= 4) {
                ambassadorExist.stepCompleted = 4
            } else {
                ambassadorExist.stepCompleted = ambassadorExist.stepCompleted
            }
            await ambassadorExist.save()

            return res.status(200).json({ success: true, data: { files, ambassador: ambassadorExist, message: 'Step 4 completed successfuly!' }})
        
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message })
        }
    },

    step5_accept_terms: async (req, res) => {
        try {
            let ambassador = await Ambassador.findById({ _id: req.user.id })
            if(!ambassador) return res.status(400).json({ success: false, message: 'ambassador not found' })
            
            const { terms_and_conditions } = req.body
            if(!terms_and_conditions || terms_and_conditions === null || terms_and_conditions === undefined) return res.status(400).json({ success: false, message: "check the terms and conditions!" })

            ambassador.termsAccepted = true
            ambassador.stepCompleted = ambassador.stepCompleted <= 5 ? 5 : ambassador.stepCompleted
            await ambassador.save()

            let partner_invitation_link = `${process.env.CLIENT_SIDE_URL}/partner/register?ambassador_referrer=${ambassador?._id}`
            let ambassador_invitation_link = `${process.env.CLIENT_SIDE_URL}/ambassador/register?ambassador_referrer=${ambassador?._id}`

            // await ConfirmationMail('ambassador', ambassador?.email, partner_invitation_link, ambassador_invitation_link)
            await sendConfirmationEmail('ambassador', ambassador?.email, partner_invitation_link, ambassador_invitation_link)
            
            return res.status(200).json({ success: true, data: { ambassador, message: 'Step 6: terms and conditions accepted!'} })
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message })
        }
    },

    ambassador_info: async (req, res) => {
        try {
            let ambassador = await Ambassador.findById({ _id: req.user.id }).select('-password')
            if(!ambassador) return res.status(400).json({ success: false, message: 'ambassador not found' })
            
            return res.status(200).json({ success: true, data: { ambassador, message: 'Step 6: terms and conditions accepted!'} })
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message })
        }
    },
    

    removePhoto: async (req, res) => {
        try {
            const { public_id, key } = req.body

            let ambassador = await Ambassador.findById({ _id: req.user.id }).select('-password')
            if(!ambassador) return res.status(400).json({ success: false, message: 'ambassador not found' })
            if(!public_id) return res.status(400).json({ msg: "No file selected!" })
    
            let filtredArray = ambassador[key].filter(img => img.public_id !== public_id)
            ambassador[key] = filtredArray
            await ambassador.save()

            cloudinary.v2.uploader.destroy(public_id, (error, result) => {
                if(error) throw error
                return res.status(200).json({ success: true, data: { ambassador, message: "File deleted successfuly!"} })
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

            return cloudinary.v2.uploader.upload(files.tempFilePath, { folder: file_name }, (err, result) => {
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

            if(filesSize > 30 * 1024 * 1024)
                return res.status(400).json({ msg: "Maximum size is 30MB!" })

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
    return jwt.sign(id, process.env.AMBASSADOR_ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
}

const createRefreshToken = (id) => {
    return jwt.sign(id, process.env.AMBASSADOR_REFRESH_TOKEN_SECRET, { expiresIn: '7d' })
}

module.exports = AmbassadorCtrl