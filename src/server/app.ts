'use strict';
(function () {
    const express = require('express');
    const path = require('path');
    const gdal = require("gdal");
    const dataset = gdal.open("C:\Users\shkid\Desktop\uhi disser\first manual test\LC08_L2SP_135024_20220202_20220211_02_T1\LC08_L2SP_135024_20220202_20220211_02_T1_QA_RADSAT.TIF");
    console.log('dataset', dataset.bands.count())
    // const logger = require('morgan');
    // const cookieParser = require('cookie-parser');
    // const bodyParser = require('body-parser');
    // const routes = require('./routes.js');

    const app = express();
    const publicPath = path.resolve(__dirname, '../dist');
    const port = 3000;

    // point for static assets
    app.use(express.static(publicPath));

    //view engine setup
    app.set('views', path.join(__dirname, '../dist'));
    app.engine('html', require('ejs').renderFile);
    app.set('view engine', 'html');

    // app.use(logger('dev'));
    // app.use(bodyParser.json());
    // app.use(bodyParser.urlencoded({
    //     extended:true
    // }));

    // app.use('/', routes);

    // app.use(cookieParser());

    const server = app.listen(port, () => console.log(`Express server listening on port ${port}`));

    module.exports = app;

}());