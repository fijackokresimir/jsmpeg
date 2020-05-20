const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: './src-vision/index.js',
    module: {
        rules: [
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src-vision/index.html'
        })
    ],
    resolve: {
        extensions: [ '.js' ],
    },
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, './../dist'),
    },
    watchOptions: {
        ignored: /node_modules/
    }
};
