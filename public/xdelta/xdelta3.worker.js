import createXdelta3Module from './xdelta3.js'

const bufferSize = 4 * 1024 * 1024
const cacheSize = 32
const PROGRESS_INTERVAL = 8 * 1024 * 1024

let module = undefined
const state = {
  sourceFile: undefined,
  inputFile: undefined,
  errorMessage: undefined,
  hasChecksums: null,
  discardOutput: false,
  bytesOut: 0,
  bytesIn: 0,
  lastProgressAt: 0,
}

// eslint-disable-next-line no-undef
const reader = new FileReaderSync()

function readSource(buffer, offset, size) {
  return readFile(state.sourceFile, buffer, Number(offset), size)
}

function readInput(buffer, offset, size) {
  const read = readFile(state.inputFile, buffer, Number(offset), size)
  state.bytesIn += read
  return read
}

function reportChecksums(hasChecksums) {
  state.hasChecksums = hasChecksums ? true : false
}

function readFile(file, buffer, offset, size) {
  const end = Math.min(file.size, offset + size)
  const blob = file.slice(offset, end)
  const read = end - offset
  const data = reader.readAsArrayBuffer(blob)
  module.HEAP8.set(new Uint8Array(data), buffer)
  return read
}

function maybeProgress() {
  if (state.bytesOut - state.lastProgressAt >= PROGRESS_INTERVAL) {
    postMessage({
      type: 'progress',
      bytesOut: state.bytesOut,
      bytesIn: state.bytesIn,
    })
    state.lastProgressAt = state.bytesOut
  }
}

function outputFile(buffer, size) {
  state.bytesOut += size
  if (!state.discardOutput) {
    const dataView = new Uint8Array(module.HEAP8.buffer, buffer, size)
    const data = new Uint8Array(dataView)
    postMessage({ type: 'chunk', bytes: data }, [data.buffer])
  }
  maybeProgress()
}

function reportError(msgPtr) {
  state.errorMessage = module.UTF8ToString(msgPtr)
}

function postDone(ok, errorCode) {
  const msg = {
    type: 'done',
    ok,
    hasChecksums: state.hasChecksums,
  }
  if (errorCode !== undefined) {
    msg.errorCode = errorCode
  }
  if (state.errorMessage) {
    msg.errorMessage = state.errorMessage
  }
  postMessage(msg)
}

onmessage = async function (event) {
  if (!event.data) {
    return
  }
  const { command, mode, sourceFile, inputFile, disableChecksum, discardOutput } = event.data
  if (command !== 'start') {
    return
  }

  state.sourceFile = sourceFile
  state.inputFile = inputFile
  state.errorMessage = undefined
  state.hasChecksums = null
  state.discardOutput = !!discardOutput
  state.bytesOut = 0
  state.bytesIn = 0
  state.lastProgressAt = 0

  try {
    module = await createXdelta3Module()
    module.readInput = readInput
    module.readSource = readSource
    module.outputFile = outputFile
    module.reportError = reportError
    module.reportChecksums = reportChecksums

    const result = module.callMain([
      mode,
      bufferSize.toString(),
      cacheSize.toString(),
      (!!disableChecksum).toString(),
      // Known source size lets the encoder search the whole source for matches.
      sourceFile.size.toString(),
    ])

    if (result !== 0) {
      postDone(false, result)
    } else {
      postDone(true)
    }
  } catch (e) {
    console.error(e)
    if (!state.errorMessage && e && typeof e.message === 'string') {
      state.errorMessage = e.message
    }
    postDone(false)
  }
  module = undefined
}
