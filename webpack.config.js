const path = require("path");

module.exports = {
  mode: "development",

  entry: "./src/main.js",

  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
  },

  devtool: "source-map",

  devServer: {
    port: 3000,
    hot: true,
    open: true,
    proxy: [
      {
        context: ["/api"],
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    ],
    static: {
      directory: path.join(__dirname, "dist"),
    },
  },

  module: {
    rules: [
      {
        test: /\.html$/,
        type: "asset/source",
      },
      {
        resourceQuery: /raw/,
        type: "asset/source",
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
};