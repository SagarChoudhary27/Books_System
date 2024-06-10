const Book = require("./models/book");
const ExpressError = require("./utils/ExpressError.js");
const {bookSchema} = require("./schema.js");

module.exports.isLoggedIn = (req, res, next) =>{
    if(!req.isAuthenticated()){
        req.session.redirectUrl = res.originalUrl;
        
        req.flash("error", "Please Login First");
        return res.redirect("/login");
    }
    next();
};

module.exports.saveRedirectUrl = (req, res, next)=>{
    if(req.session.redirectUrl){
        req.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
};
 
module.exports.isOwner = async(req, res, next) =>{
    let {id} = req.params;
    let book = await Book.findById(id);
    if(! book.owner._id.equals(res.locals.currUser._id)){
        req.flash("error", "You are not the owner of this book!");
        return res.redirect(`/books/${id}`);
    }
    next();
};

module.exports.validateBook = (req, res, next) =>{
    let {error} = bookSchema.validate(req.body);
    // console.log(result);
    if(error){
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    }
    else{
        next();
    }
};