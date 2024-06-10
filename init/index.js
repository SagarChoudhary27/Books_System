const mongoose = require("mongoose");
const initData = require("./data.js");
const Book = require("../models/book.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/book";

main()
.then(() => {
    console.log('Connected to DB');
})
.catch((err) => {
    console.log(err);
})

async function main() {
    await mongoose.connect(MONGO_URL);
}

const initDB = async() => {
    await Book.deleteMany({});
    initData.data = initData.data.map((obj) =>({...obj, owner: "6666bcc0edc95d71789f83b3"}));
    await Book.insertMany(initData.data);  
    console.log("Data was intialized");
}

initDB(); 