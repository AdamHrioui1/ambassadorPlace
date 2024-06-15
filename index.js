require('dotenv').config()
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fileupload = require('express-fileupload');
const connection = require('./database/connection.js');

const app = express()
const PORT = process.env.PORT || 8080

app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(cors())
app.use(cookieParser())
app.use(fileupload({
    useTempFiles: true
}))

connection()

app.use('/api/v0/partner/', require('./routes/Partner.routes.js'))
app.use('/api/v0/ambassador/', require('./routes/Ambassador.routes.js'))

app.get('/', (req, res) => {
    try {
        return res.status(200).json({ success: true, data: 'welcome home!' })
    } catch(error) {
        return res.status(500).json({ success: false, message: error.message })
    }
})

app.listen(PORT, () => console.log(`server is listening on port: http://localhost:${PORT}`))