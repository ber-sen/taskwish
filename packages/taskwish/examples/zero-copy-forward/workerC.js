import { decode } from "cbor2";

self.onmessage = (event) => {
  console.log("worker c")
  console.log(decode(event.data.message))
};
