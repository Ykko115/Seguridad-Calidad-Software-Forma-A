module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
  plugins: [
    function importMetaEnvPlugin() {
      return {
        visitor: {
          MemberExpression(path) {
            const obj = path.node.object;
            if (
              obj &&
              obj.type === 'MetaProperty' &&
              obj.meta.name === 'import' &&
              path.node.property.name === 'env'
            ) {
              path.replaceWithSourceString('process.env');
            }
          },
        },
      };
    },
  ],
};