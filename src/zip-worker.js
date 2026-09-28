import { unzip } from 'fflate';

self.onmessage = ({ data }) => {
  unzip(new Uint8Array(data), (error, files) => {
    if (error) {
      self.postMessage({ error: error.message || String(error) });
      return;
    }
    const entries = Object.entries(files).filter(([path]) => !path.endsWith('/'));
    const transfer = entries.map(([, bytes]) => bytes.buffer);
    self.postMessage({ entries }, transfer);
  });
};
