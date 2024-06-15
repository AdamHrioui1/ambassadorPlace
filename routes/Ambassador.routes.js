const router = require('express').Router()
const AmbassadorCtrl = require('../controllers/Ambassador.controller')
const ambassadorAuth = require('../middleware/ambassadorAuth')

router.post('/register', AmbassadorCtrl.register)
router.post('/login', AmbassadorCtrl.login)
router.get('/refreshtoken', AmbassadorCtrl.refreshtoken)
router.get('/logout', AmbassadorCtrl.logout)

router.put('/step-1', ambassadorAuth, AmbassadorCtrl.step1)
router.put('/resend-phone-code', ambassadorAuth, AmbassadorCtrl.resend_phone_code)
router.put('/step-2', ambassadorAuth, AmbassadorCtrl.step2_verify_email)
// router.put('/step-3', ambassadorAuth, AmbassadorCtrl.step3_verify_phone)
router.put('/step-3', ambassadorAuth, AmbassadorCtrl.step3_passport_or_nationalId)
router.put('/step-4', ambassadorAuth, AmbassadorCtrl.step4_photo)
router.put('/step-5', ambassadorAuth, AmbassadorCtrl.step5_accept_terms)
router.get('/infos', ambassadorAuth, AmbassadorCtrl.ambassador_info)

router.post('/remove-photo', ambassadorAuth, AmbassadorCtrl.removePhoto)

module.exports = router