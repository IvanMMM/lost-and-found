"use strict";

//Окружение
let PORT = process.env.PORT || 2000;
let MODE = process.env.MODE  || "development";

const express = require('express');
const app = new express();
const passport = require("passport");
const flash = require('express-flash');
const session = require('express-session');

//База
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/lf');

const MongoStore = require('connect-mongo')(session);

//Middleware
const secret = require('./configs/credentials').secret;
app.use(require('morgan')('dev'));
app.use(require('body-parser').urlencoded({
    extended: true
}));
app.use(session(
    {
        secret: secret,
        resave: true,
        saveUninitialized: true,
        store: new MongoStore({ mongooseConnection: mongoose.connection })
    }
));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());


//Подключаем роуты
require('./routes/routes')(app);

app.use(function (req, res, next) {
    res.status(404).end('Page not found');
});

app.listen(PORT,()=>{
    console.log(`Server is UP at ${PORT} in ${MODE} mode.`)
});