function args(params = []) {
  const options = {};
  if (params.length) {
    params.forEach(
      (cmd) => {
        const [key, value] = cmd.split('=');
        options[key] = value;
      },
    );
  }

  return options;
}

module.exports = {
  args,
};
