export const getConfig = (mode?: string) => {
  let config = require('./config.global').default;
  if(typeof mode === 'undefined') mode = process.env.RUN_MODE || 'dev';
  let localConfig;
  try {
    localConfig = require(`./config.${mode}`).default;
  }
  catch (e) {
    localConfig = {};
  }
  if(mode === 'test') localConfig.inTesting = true;
  return {...config, ...localConfig};
};
