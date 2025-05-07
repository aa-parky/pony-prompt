const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");

const serverConfig = {
  devtool: false,
  target: "node",
  entry: "./src/index.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "plugin.js",
    libraryTarget: "commonjs2", // Changed from 'commonjs' to 'commonjs2'
    // libraryExport: 'default', // This line has been removed or commented out
  },

  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          format: {
            comments: false,
          },
        },
      }),
    ],
  },
  plugins: [],
};

module.exports = [serverConfig];

