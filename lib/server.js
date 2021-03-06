'use strict';

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _compression = require('compression');

var _compression2 = _interopRequireDefault(_compression);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _cookieParser = require('cookie-parser');

var _cookieParser2 = _interopRequireDefault(_cookieParser);

var _expressWs2 = require('express-ws');

var _expressWs3 = _interopRequireDefault(_expressWs2);

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

var _api = require('./api');

var _api2 = _interopRequireDefault(_api);

var _ws = require('./ws');

var _ws2 = _interopRequireDefault(_ws);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_mongoose2.default.connect(process.env.BEEPRO_MONGO_URL || 'mongodb://localhost:27017', {
  useMongoClient: true
});
_mongoose2.default.Promise = global.Promise;

var _expressWs = (0, _expressWs3.default)((0, _express2.default)()),
    app = _expressWs.app;

app.use((0, _compression2.default)());
app.use((0, _cookieParser2.default)());
app.use(_bodyParser2.default.json());
app.use(_bodyParser2.default.urlencoded({ extended: false }));

(0, _api2.default)(app, _mongoose2.default);
(0, _ws2.default)(app, _mongoose2.default);

app.get('/', function (req, res) {
  res.send('<html><body><form enctype="multipart/form-data" action="/api/honeys/hoge/files/aaa/bbb.txt" method="POST" ><input type="file" name="file" ><input type="submit"></form><form method="DELETE" action="/api/honeys/hoge/files/aaa/bbb.png"><input type="submit"></form></body></html>');
});

app.listen(process.env.PORT || 5432);