import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import log from '../logger.js'

function initFFmpeg() {
  const ffmpegPath = {
    'development-win32': path.join(__dirname, '../../resources/ffmpeg/win-amd64/bin/ffmpeg.exe'),
    'development-linux': path.join(__dirname, '../../resources/ffmpeg/linux-amd64/ffmpeg'),
    'development-darwin': 'ffmpeg',
    'production-win32': path.join(
      process.resourcesPath,
      'app.asar.unpacked',
      'resources',
      'ffmpeg',
      'win-amd64',
      'bin',
      'ffmpeg.exe'
    ),
    'production-linux': path.join(
      process.resourcesPath,
      'app.asar.unpacked',
      'resources',
      'ffmpeg',
      'linux-amd64',
      'ffmpeg'
    ),
    'production-darwin': 'ffmpeg'
  }

  if(process.env.NODE_ENV === undefined){
    process.env.NODE_ENV = 'production'
  }

  const ffmpegKey = `${process.env.NODE_ENV}-${process.platform}`
  const ffmpegPathValue = ffmpegPath[ffmpegKey] || 'ffmpeg'
  log.debug('ENV:', `${process.env.NODE_ENV}-${process.platform}`)
  log.info('FFmpeg path:', ffmpegPathValue)
  try {
    ffmpeg.setFfmpegPath(ffmpegPathValue)
  } catch (err) {
    log.warn('Could not set custom ffmpeg path, falling back to system PATH:', err)
  }

  const ffprobePath = {
    'development-win32': path.join(__dirname, '../../resources/ffmpeg/win-amd64/bin/ffprobe.exe'),
    'development-linux': path.join(__dirname, '../../resources/ffmpeg/linux-amd64/ffprobe'),
    'development-darwin': 'ffprobe',
    'production-win32': path.join(
      process.resourcesPath,
      'app.asar.unpacked',
      'resources',
      'ffmpeg',
      'win-amd64',
      'bin',
      'ffprobe.exe'
    ),
    'production-linux': path.join(
      process.resourcesPath,
      'app.asar.unpacked',
      'resources',
      'ffmpeg',
      'linux-amd64',
      'ffprobe'
    ),
    'production-darwin': 'ffprobe'
  }

  const ffprobeKey = `${process.env.NODE_ENV}-${process.platform}`
  const ffprobePathValue = ffprobePath[ffprobeKey] || 'ffprobe'
  log.info('FFprobe path:', ffprobePathValue)
  try {
    ffmpeg.setFfprobePath(ffprobePathValue)
  } catch (err) {
    log.warn('Could not set custom ffprobe path, falling back to system PATH:', err)
  }
}

initFFmpeg()

export function extractAudio(videoPath, audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .save(audioPath)
      .on('end', () => {
        log.info('audio split done')
        resolve(true)
      })
      .on('error', (err) => {
        reject(err)
      })
  })
}

export async function toH264(videoPath, outputPath) {
  // const hasNvidia = await detectNvidia()
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .videoCodec('libx264')
      .outputOptions('-pix_fmt yuv420p')
      .save(outputPath)
      .on('end', () => {
        log.info('video convert to h264 done')
        resolve(true)
      })
      .on('error', (err) => {
        reject(err)
      })
  })
}

function detectNvidia() {
  return new Promise((resolve) => {
    const exec = require('child_process').exec;
    exec('nvidia-smi', (error, stdout, stderr) => {
      if (error || stderr) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

export function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath).ffprobe((err, data) => {
      if (err) {
        log.error("🚀 ~ ffmpeg ~ err:", err)
        reject(err)
      } else if (data && data.streams && data.streams.length > 0) {
        resolve(data.streams[0].duration) // 单位秒
      } else {
        log.error('No streams found')
        reject(new Error('No streams found'))
      }
    })
  })
}
