let timer, resolver = null;

const delay = ms => {
  return new Promise(async (resolve, reject) => {
    resolver = resolve;
    timer = setTimeout(() => {
      resolver = null;
      resolve(null);
    }, ms);
  });
}

const cancelDelay = () => {
  clearTimeout(timer);
  if (resolver) resolver();
}

export { delay, cancelDelay };