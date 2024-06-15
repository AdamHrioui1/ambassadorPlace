const mongoose = require('mongoose');

const connection = async () => {
    try {
        const con = await mongoose.connect(process.env.MONGO_URI)
        console.log(`mongodb connected successfuly: ${con.connection.host}`)
    } catch (err) {
        console.log(err.message)
    }
}

module.exports = connection