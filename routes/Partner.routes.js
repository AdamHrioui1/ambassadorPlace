const router = require('express').Router()
const PartnerCtrl = require('../controllers/Partner.controller')
const partnerAuth = require('../middleware/partnerAuth')

router.post('/register', PartnerCtrl.register)
router.post('/login', PartnerCtrl.login)
router.get('/refreshtoken', PartnerCtrl.refreshtoken)
router.get('/logout', PartnerCtrl.logout)

router.put('/step-1', partnerAuth, PartnerCtrl.step1)
router.put('/step-2', partnerAuth, PartnerCtrl.step2)
router.put('/step-3', partnerAuth, PartnerCtrl.step3)
router.put('/step-4', partnerAuth, PartnerCtrl.step4)
router.put('/step-5', partnerAuth, PartnerCtrl.step5)
router.put('/step-6', partnerAuth, PartnerCtrl.step6)
router.put('/step-7', partnerAuth, PartnerCtrl.step7)
router.get('/infos', partnerAuth, PartnerCtrl.partner_info)

router.post('/remove-photo', partnerAuth, PartnerCtrl.removePhoto)

module.exports = router