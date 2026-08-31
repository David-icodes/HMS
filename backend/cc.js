const fs=require('fs'),path=require('path');
const root='D:/LIve Projects/HMS';
const model=root+'/backend/src/models/Doctor.js';
console.log('=== Doctor model ==='); console.log(fs.existsSync(model)?fs.readFileSync(model,'utf8'):'NOT FOUND');
