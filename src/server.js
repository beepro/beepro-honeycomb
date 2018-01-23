import express from 'express';
import compression from 'compression';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import expressWs from 'express-ws';
import mongoose from 'mongoose';
import api from './api';
import ws from './ws';

mongoose.connect(process.env.BEEPRO_MONGO_URL || 'mongodb://localhost:27017', {
  useMongoClient: true,
});
mongoose.Promise = global.Promise;

const { app } = expressWs(express());

app.use(compression());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

api(app, mongoose);
ws(app, mongoose);

app.get('/', (req, res) => {
  res.send('<html><body><form enctype="multipart/form-data" action="/api/honeys/hoge/files/aaa/bbb.txt" method="POST" ><input type="file" name="file" ><input type="submit"></form><form method="DELETE" action="/api/honeys/hoge/files/aaa/bbb.png"><input type="submit"></form></body></html>');
});

app.listen(process.env.PORT || 5432);
