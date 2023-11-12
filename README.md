# Frame Downloader
  
Download a complete video from multi-frames to mp4 file.  

## Required
[https://www.gyan.dev/ffmpeg/builds/](FFMPEG)
  
## Example
```
const fdwn = require("./frames-downloader");

fdwn("test.mp4", nbrLoop => 
  'https://replayftv-vh.akamaihd.net/i/streaming-adaptatif_france-dom-tom/5df284f4ab31/segment' + nbrLoop + '_4_av.ts'
);


// output => ./dist/test.mp4
``` 

## Options
```
/*
string, function, object = {
 debug: true/false, // true default
 maxMergeFile: number // default 50 frames sync
}
*/

fdwn(destination_file, callback_loop_frame, option);

``` 
