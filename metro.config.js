const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ignoredDirectories = [
  'admin-web',
  'wona-backend',
  'dist',
  '.npm-cache',
  '.sites-bin',
  '.claude',
  '.expo',
];

config.resolver.blockList = ignoredDirectories.map((directory) => {
  const absolutePath = path
    .resolve(__dirname, directory)
    .split(path.sep)
    .map(escapeRegExp)
    .join('[\\\\/]');
  return new RegExp(`^${absolutePath}(?:[\\\\/].*)?$`);
});

module.exports = config;
