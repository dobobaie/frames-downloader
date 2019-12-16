const fs = require("fs");

/**
 * @name : mkdirp
 */
const mkdirp = directoryPath =>
  directoryPath
    .replace(/\\/g, "/")
    .split("/")
    .reduce((accumulator, cVal) => {
      const fDirectoryPath = `${accumulator}${cVal}/`;
      if (!fs.existsSync(fDirectoryPath) && (cVal !== "." && cVal !== "..")) {
        fs.mkdirSync(fDirectoryPath);
      }
      return fDirectoryPath;
    }, "");

/**
 * @name : touch
 */
const touch = filePath => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  return fs.writeFileSync(filePath, '');
};

/**
 * @name : rm
 */
const rm = filePath =>
  fs.unlinkSync(filePath);

/**
 * @name : rmp
 */
const rmp = directoryPath =>
  fs.existsSync(directoryPath)
    ?
      fs.readdirSync(directoryPath)
        .map(file =>
          rm(directoryPath + "/" + file)
        )
    : true;

module.exports = {
  mkdirp,
  rmp,
  rm,
  touch
};
