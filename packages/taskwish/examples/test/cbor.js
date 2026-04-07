import { encode, decodeSequence } from "cbor2";

// Shared buffer setup
const BUFFER_SIZE = 1024 * 1024;
const shared = new SharedArrayBuffer(BUFFER_SIZE);
const view = new Uint8Array(shared);
let offset = 0;

function appendCbor(item) {
  const encoded = encode(item);
  if (offset + encoded.length > view.length) throw new Error("Buffer full");
  
  view.set(encoded, offset);
  offset += encoded.length;
}

// Example: Adding multiple items
appendCbor({ id: 1, payload: new Uint8Array([1, 2, 3]) });
appendCbor({ id: 2, status: "success" });

// Read CBOR sequence correctly
function readCborSequence() {
  // Use decodeSequence to return an iterator of all items in the buffer
  // Slice or subarray the view to only include written data
  const dataToDecode = view.subarray(0, offset);
  
  // You can spread the iterator into an array or loop over it
  return [...decodeSequence(dataToDecode)];
}

const items = readCborSequence();
console.log(items);