const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');
const mobileModules = path.resolve(projectRoot, 'node_modules');

// Watch only the shared directory
config.watchFolders = [path.resolve(monorepoRoot, 'shared')];

// Only resolve from mobile's node_modules
config.resolver.nodeModulesPaths = [mobileModules];

// Block the parent's node_modules and src from being resolved
const parentNodeModules = path.resolve(monorepoRoot, 'node_modules');
const parentSrc = path.resolve(monorepoRoot, 'src');
config.resolver.blockList = [
  new RegExp(parentNodeModules.replace(/[/\\]/g, '[/\\\\]') + '.*'),
  new RegExp(parentSrc.replace(/[/\\]/g, '[/\\\\]') + '.*'),
];

module.exports = config;
