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

app.listen(process.env.PORT || 5432);
