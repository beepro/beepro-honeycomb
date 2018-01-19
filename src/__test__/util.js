import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs-extra';
import {
  getModel,
} from '../honey';

module.exports = {
  init: () => {
    mongoose.connect(process.env.BEEPRO_MONGO_URL || 'mongodb://localhost:27017', {
      useMongoClient: true,
    });
    mongoose.Promise = global.Promise;
  },
  clean: (id = 'beepro-test') => {
    const honeyPath = path.join(process.cwd(), 'workspace', id);

    fs.removeSync(honeyPath);
    const Model = getModel(mongoose);
    return Model.findOneAndRemove({
      id,
    });
  },
};
