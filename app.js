if(process.env.NODE_ENV != "production"){
    require("dotenv").config();
}



// All module Require ------------------------------------------------------------------------------------------------------
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Book = require("./models/book.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user.js');
const flash = require('connect-flash');
const {isLoggedIn, saveRedirectUrl, isOwner, validateBook} = require("./middleware.js");
const {storage}  = require('./cloudConfig.js');
const multer  = require('multer');
const upload = multer({ storage });

// MongoDB Initialization-----------------------------------------------------
// const MONGO_URL = "mongodb://127.0.0.1:27017/book";
const dbURL = process.env.ATLASDB_URL;
main()
    .then(() => {
        console.log('Connected to DB');
    })
    .catch((err) => {
        console.log(err);
    })
    
async function main() {
    await mongoose.connect(dbURL);
}

// App.use -----------------------------------------------------------------------------------------------------------------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "/public"))); 
 



// Session--------------------------------------------------------------------
const store = MongoStore.create({
    mongoUrl : dbURL,
    crypto:{
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600,
});

store.on("error", ()=>{
    console.log("Session Store Error", err);
});

const sessionOption = {
    store,
    secret: process.env.SECRET, 
    resave: false, 
    saveUninitialized: true,
    cookie : {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge : 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
};

app.use(session(sessionOption));
app.use(flash());


// Passport library initialize------------------------------------------------
app.use(passport.initialize()); 
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());  

// Local Storage----------------------------------------------------------------
app.use((req, res, next)=>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});



// // ------------Root Route------------------------------
// app.get('/', (req, res)=>{
//     res.send('I am a Root');
// })
    


// Sign up System---------------------------------------------------------------
app.get("/signup", (req, res)=>{
    res.render("users/signup.ejs");
});

app.post("/signup", wrapAsync(async(req, res)=>{

    try{
        let {username, password} = req.body;
        const newUser = new User({username, password});
        const registeredUser = await User.register(newUser, password);
        req.login(registeredUser, (err) => {
            if (err) { return next(err); }
            req.flash("success", "Welcome to Books System");
            res.redirect("/books");
        });


    }catch(e){
        req.flash("error" , e.message);
        res.redirect("/signup");
    }
}));
 



// Login System-------------------------------------------------------------------
app.get("/login", (req, res)=>{
    res.render("users/login.ejs");
});

app.post("/login", saveRedirectUrl, passport.authenticate("local", {failureFlash: true, failureRedirect: "/login"}), (req, res)=>{
    req.flash("success", "Welcome to Books System");
    let redirectUrl = res.locals.redirectUrl || "/books";
    res.redirect(redirectUrl);
});




// Logout------------------------------------------------------------------------
app.get("/logout", (req, res, next)=>{
    req.logout((err)=>{
        if(err){
            return next(err);
            // req.flash("error", err.message);
            // res.redirect("/login");
        }
        req.flash("success", "Logged Out Successfully.");
        res.redirect("/login");
    })
});




//------------------------------------------- All important routes ------------------------------------------------

//index route
app.get("/books", wrapAsync(async (req, res)=>{
    const allBooks =  await Book.find({});
    res.render("index.ejs", {allBooks});
}));


//New Route
app.get("/books/new", isLoggedIn ,(req, res)=>{
    res.render("new.ejs");
});


//show route
app.get("/books/:id" ,isLoggedIn,  wrapAsync(async(req, res) =>{
    let {id} = req.params;
    const book = await Book.findById(id).populate("owner");
    if(!book){
        req.flash("error", "Book Not Found!");
        return res.redirect("/books");
    }
    res.render("show.ejs", {book});
})); 
 

//create route
app.post("/books", isLoggedIn , upload.single("book[pdf]") , validateBook, wrapAsync(async (req, res)=>{
    let url = req.file.path;
    let filename = req.file.filename;
    const newBook = new Book(req.body.book);
    newBook.owner = req.user._id;
    newBook.pdf = {url, filename};
    await newBook.save(); 
    req.flash("success", "Book Added Successfully.");
    res.redirect("/books");
}));


//edit route
app.get("/books/:id/edit", isLoggedIn ,isOwner, wrapAsync(async(req, res)=>{
    let {id} = req.params;
    const book = await Book.findById(id);
    res.render("edit.ejs", {book});
}));


//update route
app.put("/books/:id", isLoggedIn ,isOwner, upload.single("book[pdf]"), validateBook, wrapAsync(async (req, res)=>{
    let {id} = req.params;
    let book = await Book.findByIdAndUpdate(id, {...req.body.book});
    if(typeof req.file !== "undefined"){
        let url = req.file.path;
        let filename = req.file.filename;
        book.pdf = {url, filename};
        await book.save();
    }
    
    res.redirect(`/books/${id}`);
}));


//delete route
app.delete("/books/:id", isLoggedIn , isOwner, wrapAsync(async(req, res)=>{
    let {id} = req.params;
    await Book.findByIdAndDelete(id);
    req.flash("success", "Book Deleted Successfully!");
    res.redirect("/books");
}));




// ---------------------Error Handle --------------------------------------------
app.all("*", (req, res, next)=>{
    next(new ExpressError(404, "Page Not Found"));
});

app.use((err, req, res, next)=>{
    let{status = 500, message = "Something went Wrong!"} = err;
    res.status(status).render("PageNotFound.ejs", {message});
    // res.status(status).send(message);
});




// -------------------------port listen at port 8080------------------------------
app.listen(8080, ()=>{
    console.log("server is listening to port 8080");
});
