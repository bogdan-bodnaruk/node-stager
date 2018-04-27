function createObject(string = '', value = null) {
  if (!string || !string.length) {
    return string;
  }

  const keys = string.split('.').reverse();
  let object = {};

  keys.forEach(
    (key, index) => {
      if (!index) {
        object[key] = value;
        return;
      }

      object = {
        [key]: object,
      };
    },
  );

  return object;
}

function args(params = []) {
  let options = {};
  if (params.length) {
    params.forEach(
      (cmd) => {
        const [keys, value] = cmd.split('=');
        const object = createObject(keys, value);
        options = {
          ...options,
          ...object,
        };
      },
    );
  }

  return options;
}

module.exports = {
  args,
};
