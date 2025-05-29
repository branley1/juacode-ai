module.exports = {
  // Override the development server configuration
  devServer: (devServerConfig, { env, paths, proxy, allowedHost }) => {
    // Set allowedHosts so that it contains a valid non-empty string.
    devServerConfig.allowedHosts = ['localhost'];
    return devServerConfig;
  },
  // Use the webpack field to add webpack-specific configuration
  webpack: {
    configure: (webpackConfig) => {
      // Allow importing from outside of src directory
      webpackConfig.resolve.modules = [
        ...webpackConfig.resolve.modules,
        'node_modules',
      ];
      
      return webpackConfig;
    },
  },
};
