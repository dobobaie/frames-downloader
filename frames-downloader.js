const Promise = require("bluebird");
const fs = require("fs");
const request = require("request");
const uuidv4 = require("uuid/v4");
const ffmpeg = require('fluent-ffmpeg');

const utils = require('./utils');

let round = 0;
const nameTmpDir = "tmp";
const nameDistDir = "dist";

const debug = options => (...args) =>
  options.debug && console.log(args.join(' '));

const gRandomName = () => {
  const randomName = uuidv4();
  const mediaName = __dirname + "/" + nameTmpDir + "/" + randomName + ".mp4";
  return mediaName;
};

const requestFile = (urlmedia, videoList) => mediaName =>
  new Promise((resolve, reject) => {
    let merror = null;
    request
      .get(urlmedia)
      .on('response', res => {
        if (res.headers['content-type'] !== 'video/MP2T') {
          merror = `Bad content-type format ${res.headers['content-type']}`;
        }
      })
      .pipe(
        fs.createWriteStream(mediaName)
      )
      .on('finish', () =>
        merror
          ? reject(merror)
          : resolve()
      )
      .on('error', error => 
        reject(error)
      )
  });

const requestFiles = (logicFiles, options) => videoList =>
  new Promise(async (resolve, reject) => {
    debug(options)("Process frames downloading");
    let nbrLoop = 1;
    while (true) {
      debug(options)("Download frame n°" + nbrLoop);
      const mediaName = gRandomName();
      const urlmedia = logicFiles(nbrLoop++);
      const merror = await requestFile(urlmedia, videoList)(mediaName)
        .catch(err => err);
      if (merror) {
        reject(merror);
        break;
      }
      videoList.push(mediaName);
    }
  });

const processMerge = options => (sortedFiles, step) =>
  new Promise((resolve, reject) => {
    debug(options)("Process frames merging round n°", round, "step n°", step + 1);
    const mediaName = gRandomName();
    const fvideo = ffmpeg();
    sortedFiles.map(video =>
      fvideo.mergeAdd(video)
    );
    fvideo
      // .videoBitrate(1000)
      // .audioBitrate(128)
      .on('error', err => reject(err))
      .on('end', () => {
        sortedFiles.map(video => utils.rm(video));
        resolve(mediaName);
      })
      .mergeToFile(mediaName);
  });

const sortFilesAndMerge = options => async videoList => {
  debug(options)("Sort frames merging round n°", (round++) + 1);
  const sortedFiles = videoList.reduce((acc, video, index) => {
    const plmerge = ~~(index / options.maxMergeFile);
    acc[plmerge] = acc[plmerge] || [];
    acc[plmerge].push(video);
    return acc;
  }, []);
  const mergedFiles = await Promise.mapSeries(sortedFiles, processMerge(options));
  return mergedFiles.length === 1
    ? mergedFiles.shift()
    : sortFilesAndMerge(options)(mergedFiles);
};

module.exports = async (nameDistFile, logicFiles, opts) =>
{
  const options = Object.assign({
    debug: true,
    maxMergeFile: 50
  }, opts || {});

  const videoList = [];

  utils.rmp(__dirname + "/" + nameTmpDir);
  utils.mkdirp(__dirname + "/" + nameTmpDir);
  utils.mkdirp(__dirname + "/" + nameDistDir);

  await requestFiles(logicFiles, options)(videoList)
    .catch(e => debug(options)(e));

  const finalyFileName = await sortFilesAndMerge(options)(videoList);
  debug(options)(`"sortFilesAndMerge" process are finished. Tmp file => ${finalyFileName}`);

  fs.copyFileSync(finalyFileName, __dirname + "/" + nameDistDir + "/" + nameDistFile);
  debug(options)(`The file "${nameDistFile}" is now available.`);

  utils.rm(finalyFileName);
};
