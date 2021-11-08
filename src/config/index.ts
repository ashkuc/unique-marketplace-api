export const getConfig = (mode?: string) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const config = require('./global').default;
  if(typeof mode === 'undefined') mode = process.env.RUN_MODE || 'dev';
  let localConfig;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    localConfig = require(`./${mode}`).default;
  }
  catch (e) {
    localConfig = {};
  }
  if(mode === 'test') localConfig.inTesting = true;
  return {...config, ...localConfig};
};
