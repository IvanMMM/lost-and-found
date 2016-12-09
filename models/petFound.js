const mongoose = require('mongoose');

let Found = new mongoose.Schema({
    name:String,                        //Имя
    type:{                              //Вид животного
        type:String,
        enum: ['Кошка', 'Собака'],
        required:true
    },
    kind:{                              //Порода животного
        type:String,
        required:true
    },
    bodyColor:{                         //Окрас туловища
        type:String,
        required:true
    },
    eyeColor:{                          //Цвет глаз
        type:String,
        required:true
    },
    age:Number,                         //Возраст
    gender:{                            //Пол
        type:String,
        enum: ['Самец', 'Самка'],
        required:true
    },
    temper:String,                      //Характер
    marked:{                            //Чипирован/Клеймо
        type: Boolean,
        required:true
    },
    collar:String,                      //Ошейник
    location:{                          //Расположение
        type: [Number],                     // [<longitude>, <latitude>]
        index: '2d'                         // create the geospatial index
    },
    foundTime:Date,                     //Время находки
    contacts:[String],                  //Контакты владельца/передержки
    comments:String,                    //Комментарии
    vetPassport:Boolean,                //Наличие ветпаспорта
    sterile:Boolean                     //Кастрирован/стерилизован
});

module.exports = mongoose.model('Found',Found);