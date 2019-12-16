# Frame Downloader
  
Download a complete video from multi-frames to mp4 file.  
  
## Example
```
const fdwn = require("./frames-downloader");

fdwn("test.mp4", nbrLoop => 
  'https://replayftv-vh.akamaihd.net/i/streaming-adaptatif_france-dom-tom/2019/S50/J4/219204271-5df284f4ab319-,standard1,standard2,standard3,standard4,standard5,.mp4.csmil/segment' + nbrLoop + '_4_av.ts?null=0'
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

fdwn(name_destination_file, callback_loop_frame_to_return_frame_url, option);

``` 
