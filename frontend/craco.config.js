module.exports = {
  // Override the development server configuration
  devServer: (devServerConfig, { env, paths, proxy, allowedHost }) => {
    // Set allowedHosts so that it contains a valid non-empty string.
    devServerConfig.allowedHosts = ['localhost'];
    return devServerConfig;
  },
};
