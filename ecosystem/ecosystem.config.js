module.exports = {
  apps: [
    {
      name: "wpp-multiatendimento-dev",
      script: "src/app.js",
      watch: false,
      env: {
        NODE_ENV: "development",
      },
    },
    {
      name: "wpp-multiatendimento-main",
      script: "src/app.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
