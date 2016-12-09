"use strict";
module.exports.safeUser = function(user){
    if(user.toObject) user = user.toObject();
    delete user.password;
    delete user.salt;
    if(user.vk) delete user.vk.token;
    return user;
};