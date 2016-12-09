"use strict";
const db = require('../models');
const passport = require("passport");
const utils = require('../libs/utils');

let PORT = process.env.PORT || 2000;
let MODE = process.env.MODE  || "development";

const LocalStrategy = require('passport-local').Strategy;
const VKontakteStrategy = require('passport-vkontakte').Strategy;


passport.use(new LocalStrategy(
    function(username, password, done) {
        db.User.findOne({ username: username }, function (err, user) {
            if (err) return done(err);
            if (!user) return done(null, false, "Пользователь не найден");
            user.verifyPassword(password)
                .then(user=>{
                    return done(null, user);
                })
                .catch((err)=>{
                    return done(null,false,err);
                });
        });
    }
));

const vkCredentials = require('../configs/credentials').vk;
passport.use(new VKontakteStrategy(
    {
        clientID:     vkCredentials.id,
        clientSecret: vkCredentials.secret,
        callbackURL:  `http://localhost:${PORT}/connect/vk/callback`,
        //apiVersion: 5.60,
        scope: ['email','offline'],
        profileFields: ['email', 'city', 'bdate'],
        passReqToCallback: true
    },
    function myVerifyCallbackFn(req, accessToken, refreshToken, params, profile, done){
        let searchObject = {};
        if(req.user){
            //Пользователь уже авторизован, добавляем информацию к его текущей инфе
            searchObject['_id'] = req.user._id;
        }else{
            //Пользователь не авторизован, создаём новый документ
            searchObject.vk = {
                id:profile.id
            }
        }
        //Здесь у нас информация о пользователе
        let json = profile._json;
        let updateObject = {
            firstName:json.first_name,
            lastLame:json.last_name,
            sex:json.sex,
            bdate:new Date(profile.birthday || 0),
            isActivated:true,
            vk:{
                token:accessToken,
                id:profile.id,
                screen_name:json.screen_name,
                photo:json.photo
            }
        };
        if(params.email) updateObject.email = params.email;

        let pUser = db.User.findOneAndUpdate(searchObject,updateObject,{new:true,upsert:true,setDefaultsOnInsert:true});

        pUser
            .exec()
            .then(user=>{
                if(!user) return new Error(`Invalid user object`);
                //Продолжаем авторизацию
                done(null,user);
            })
            .catch(err=>{
                console.error(err);
                return done(err);
            });
    }
));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    db.User.findById(id)
        .then(user=>{
            done(null, utils.safeUser(user));
        })
        .catch(done);
});

module.exports = function(app){
    //Резистрация пользователя basicAuth
    app.post('/register/local',(req,res)=>{
        delete req.body.salt;
        delete req.body.isActivated;
        delete req.body.vk;
        db.User.newBasic(req.body)
            .then(user=>{
                res.json(user)
            })
            .catch(err=>{
                let errors = [];
                if(typeof err=='string'){
                    errors.push(err);
                }else{
                    errors = err;
                }

                res.json({
                    success:false,
                    errors:errors
                })
            })
    });

    //Локальная аутенификация
    app.get('/auth/local/login',
        passport.authenticate('local', {
            successRedirect: '/',
            failureRedirect: '/auth/local/failed',
            failureFlash: true
        })
    );
    ////////////////////////
    //Авторизация ВК
    ////////////////////////
    app.get('/connect/vk',passport.authenticate('vkontakte',{scope: ['email','offline'],display:'popup'}));
    app.get('/connect/vk/callback',passport.authenticate('vkontakte',{successRedirect:'/',failureRedirect: '/connect/local/failed'}));
    ////////////////////////

    app.get('/',(req,res)=>{
        res.json({account:req.account,user:req.user});
    });

    app.get('/auth/local/failed',(req,res)=>{
        res.json(req.user);
    });
    app.get('/connect/local/failed',(req,res)=>{
        res.json(req.user);
    });
};

