const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Watch the shared directory outside the mobile project root
const sharedDir = path.resolve(__dirname, '../shared');
config.watchFolders = [sharedDir];

// Make sure Metro can resolve modules in the shared directory
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

// Map shared imports to the shared directory
config.resolver.extraNodeModules = {
  '@shared': sharedDir,
};

module.exports = config;
