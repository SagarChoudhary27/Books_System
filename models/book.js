const mongoose  = require("mongoose");
const Schema = mongoose.Schema;

const bookSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    description : String,
    pdf : {
        url : String,
        filename: String,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    } 
}); 

const Book = mongoose.model("Book", bookSchema);
module.exports = Book;