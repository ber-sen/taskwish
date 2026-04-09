// main.js
const worker = new Worker("./worker.js");
const workerC = new Worker("./workerC.js");

const channel = new MessageChannel();
// send port2 to worker
worker.postMessage({ port: channel.port2 }, [channel.port2]);

// listen on port1
channel.port1.onmessage = (e) => {
  const buffer = e.data.buffer;
  console.log("main:");
  console.log(buffer);
  workerC.postMessage({ buffer }, [buffer]);

  console.log("main after transfer:");
  console.log(buffer);
  
};

channel.port1.start();
