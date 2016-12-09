"use strict";
const mongoose = require('mongoose');
const crypto = require('crypto');
const utils = require('../libs/utils');

/*
    Итак, у нас есть 2 способа авторизации
    1: базовая
    2: вк

    В связи с этим мы не можем выставлять обязательные поля как в том, так и в другом случае.
    Возможные случаи:
    Если человек регистрируется в ВК и потом дополняет данные базовой регистрации
    Если человек регистриуется через базовую и потом привязывает свой ЛК.
*/

let User = new mongoose.Schema({
    username:{
        type:String,
        unique:[true, "Имя пользователя занято"],
        maxlength:[30,"Слишком длинное имя пользователя"],
        sparse:true
        //required:[true, "Пожалуйста укажите ваше имя пользователя"]
    },
    password:{
        type:String,
        minlength:[8,"Пароль слишком короткий"]
        //required:[true, "Пожалуйста укажите ваш пароль"]
    },
    salt:String,
    firstName:String,
    lastLame:String,
    sex:{
        type:Number
        //required:true
    },
    bdate:Date,
    email:{
        type:String,
        unique:[true, "Пользователь с таким емайлом уже зарегистрирован"],
        sparse:true,
        //required:[true, "Пожалуйста укажите ваш email"],
        maxlength:[30,"Слишком длинный email"],
        validate: {
            validator: function(v) {
                var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
                return re.test(v);
            },
            message: "Неверный формат email адреса: {VALUE}"
        }
    },
    isActivated:{
        type:Boolean,
        default:false
    },
    phone:{
        type:String,
        validate:{
            validator: function(v,cb){
                return cb(/\+(9[976]\d|8[987530]\d|6[987]\d|5[90]\d|42\d|3[875]\d|2[98654321]\d|9[8543210]|8[6421]|6[6543210]|5[87654321]|4[987654310]|3[9643210]|2[70]|7|1)\d{1,14}$/.test(v));
            },
            message:"Неверный формат телефонного номера: {VALUE}"
        },
        unique:[true, "Пользователь с таким телефонным номером уже зарегистрирован"],
        sparse:true
    },
    vk:{
        token:{
            type:String
            //required:true
        },
        id: {
            type:Number,
            unique:true,
            sparse:true
            //required:true
        },
        screen_name:String,
        photo:String
    }
});

User.statics.newBasic = function(userObject){
    function checkParams(){
        return new Promise((resolve,reject)=>{
            let errors = [];
            if(!userObject.username) errors.push("Пожалуйста укажите ваше имя пользователя");
            if(!userObject.password) errors.push("Пожалуйста укажите ваш пароль");
            if(!userObject.email) errors.push("Пожалуйста укажите ваш email");

            if(errors.length>0) return reject(errors);
            resolve()
        });
    }

    return new Promise((resolve,reject)=>{
        checkParams()
            .catch(errors=>{
                if(errors.length>0) return reject(errors);
            })
            //Хэшируем наш пароль
            .then(generateSalt)
            .then(salt=>{
                userObject.salt = salt;
            })
            .then(()=>{
                return hashPassword(userObject.password,userObject.salt)
            })
            .then(hashedPassword=>{
                userObject.password = hashedPassword;
            })
            .catch(err=>{
                return reject(`Cannot generate salt / hash password: ${err}`);
            })
            .then(()=>{
                return new mongoose.models['User'](userObject).save()
            })
            .then((user)=>{
                resolve(utils.safeUser(user));
            })
            .catch(reject);

    })
};

User.methods.verifyPassword = function(password){
    let self = this;
    return new Promise((resolve,reject)=>{
        hashPassword(password,self.salt)
            .then(hash=>{
                if(hash == self.password) return resolve(self);
                return reject(new Error('Неверный пароль'));
            })
            .catch(err=>{
                console.error(err);
            })
    })
};

//Функции хэширования
const LEN = 256;
const SALT_LEN = 64;
const ITERATIONS = 10000;
const DIGEST = 'sha256';

User.methods.hash = function(callback){
    let salt = this.salt;
    if(!salt) cb('Invalid salt');
    hashPassword(this.password,this.salt,callback)
};

function hashPassword(password, salt){
    return new Promise((resolve,reject)=>{
        crypto.pbkdf2(password, salt, ITERATIONS, LEN/2, DIGEST, function(err, derivedKey){
            if (err) reject(new Error(err));
            return resolve(derivedKey.toString('hex'));
        });
    });
}

function generateSalt(){
    return new Promise((resolve,reject)=>{
        crypto.randomBytes(SALT_LEN / 2, function(err, salt) {
            if (err) reject(new Error(err));
            return resolve(salt.toString('hex'));
        });
    })
}

//Кастомные сообщения об ошибках


module.exports = mongoose.model('User',User);