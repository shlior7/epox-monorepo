module.exports = {
  'package.json': (files) => {
    const options = files.map((file) => `--source ${file}`).join(' ');

    return `yarn syncpack format ${options}`;
  },
  'yarn.lock': () => ['syncpack list-mismatches', 'yarn dedupe --check'],
  '*': 'yarn format --write',
};
