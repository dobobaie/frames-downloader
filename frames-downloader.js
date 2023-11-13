process.on("SIGINT", () => processExit());
process.on("SIGUSR1", () => processExit());
process.on("SIGUSR2", () => processExit());

const Promise = require("bluebird");
const fs = require("fs");
const request = require("request");
const uuidv4 = require("uuid/v4");
const ffmpeg = require("fluent-ffmpeg");

const utils = require("./utils");

let round = 0;
let processAlife = true;

const nameTmpDir = "tmp";
const nameDistDir = "dist";
const nameCacheFile = ".cache.json";

const formatVideoAllowed = [
  "application/octet-stream",
  "video/mp2t",
  "video/MP2T",
];

const debug = (...args) =>
  process.env.DEBUG_ENABLED === "true" && console.log(args.join(" "));

const processExit = () => {
  if (processAlife === false) {
    process.exit(1);
  }
  processAlife = false;
  console.error(
    `Please CTRL+C again to kill the process or wait until the merge is done`
  );
};

const gRandomName = () => {
  const randomName = uuidv4();
  const mediaName = __dirname + "/" + nameTmpDir + "/" + randomName + ".mp4";
  return mediaName;
};

const requestFile = (urlmedia, mediaName) =>
  new Promise((resolve, reject) => {
    let merror = null;
    request
      .get(urlmedia)
      .on("response", (res) => {
        if (!formatVideoAllowed.includes(res.headers["content-type"])) {
          merror = `Bad content-type format ${res.headers["content-type"]}`;
        }
      })
      .pipe(fs.createWriteStream(mediaName))
      .on("finish", () => (merror ? reject(merror) : resolve()))
      .on("error", (error) => reject(error));
  });

const requestFiles = (videoList, fileLoopCb) =>
  new Promise(async (resolve, reject) => {
    debug("Process frames downloading");
    let nbrLoop = 1;
    while (processAlife) {
      debug("Download frame n°" + nbrLoop);
      const mediaName = gRandomName();
      const urlmedia = fileLoopCb(nbrLoop++);
      const merror = await requestFile(urlmedia, mediaName).catch((err) => err);
      if (merror) {
        reject(merror);
        break;
      }
      videoList.push(mediaName);
    }
    resolve();
  });

const processMerge = (inputList) =>
  new Promise((resolve, reject) => {
    const mediaName = gRandomName();
    inputList
      .reduce((fvideo, input) => fvideo.addInput(input), ffmpeg())
      // .videoBitrate(1000)
      // .audioBitrate(128)
      .on("error", (err) => reject(err))
      .on("end", () => {
        inputList.map((video) => utils.rm(video));
        resolve(mediaName);
      })
      .mergeToFile(mediaName);
  });

const sortFilesAndMerge = async (videoList, options) => {
  // ---
  debug("Sort frames merging round n°", round++ + 1);
  const inputLists = videoList.reduce((acc, video, index) => {
    const plmerge = ~~(index / options.maxMergeFile); // improve this part to cache it as well
    acc[plmerge] = acc[plmerge] || [];
    acc[plmerge].push(video);
    return acc;
  }, []);

  // ---
  const mergedFiles = await Promise.mapSeries(
    inputLists,
    (inputList, index) => {
      debug(`Process frames merging round n°${round} step n°${index + 1}`);
      return processMerge(inputList);
    }
  );

  // ---
  return mergedFiles.length === 1
    ? mergedFiles.shift()
    : sortFilesAndMerge(mergedFiles, options);
};

const defaultOption = { debug: true, maxMergeFile: 50 };
module.exports = async (nameDistFile, fileLoopCb, opts = defaultOption) => {
  const options = { ...defaultOption, opts };
  process.env.DEBUG_ENABLED = options.debug;

  let videoList = [];

  //
  const cacheFilePath = __dirname + "/" + nameCacheFile;

  // ---
  // const tmpFilesPath = __dirname + "/" + nameTmpDir;
  // for (const filename of fs.readdirSync(__dirname + "/" + nameTmpDir)) {
  //   if (![".", ".."].includes(filename)) {
  //     videoList.push({
  //       filePath: tmpFilesPath + "/" + filename,
  //       ...fs.statSync(tmpFilesPath + "/" + filename),
  //     });
  //   }
  // }
  // videoList = videoList
  //   .sort((a, b) => a.birthtimeMs - b.birthtimeMs)
  //   .map((info) => info.filePath);
  // utils.touch(cacheFilePath, JSON.stringify(videoList));
  // return;
  // ---

  // ---
  // utils.rmp(__dirname + "/" + nameTmpDir);
  utils.mkdirp(__dirname + "/" + nameTmpDir);
  utils.mkdirp(__dirname + "/" + nameDistDir);

  // ---
  if (!fs.existsSync(cacheFilePath)) {
    await requestFiles(videoList, fileLoopCb).catch(debug);

    if (videoList.length === 0) {
      debug(`No video has been downloaded`);
      process.exit(1);
    }
  } else {
    const content = fs.readFileSync(cacheFilePath, "utf8");
    videoList = JSON.parse(content);
  }

  // Save in cache
  utils.touch(cacheFilePath, JSON.stringify(videoList));

  // ---
  const finalFileName = await sortFilesAndMerge(videoList, options);
  debug(
    `"sortFilesAndMerge" process are finished. Tmp file => ${finalFileName}`
  );

  // ---
  fs.copyFileSync(
    finalFileName,
    __dirname + "/" + nameDistDir + "/" + nameDistFile
  );
  debug(`The file "${nameDistFile}" is now available.`);

  // ---
  utils.rm(finalFileName);
  utils.rm(cacheFilePath);
};
