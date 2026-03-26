import { JSDOM } from 'jsdom';
import canvas from 'canvas';

global.self = global;
global.window = new JSDOM().window;

const QRCodeStyling = (await import('qr-code-styling-node')).default;

const options = {
    width: 300,
    height: 300,
    data: "https://www.facebook.com/",
    dotsOptions: { color: "#4267b2", type: "rounded" },
    nodeCanvas: canvas,
    jsdom: JSDOM
};

try {
  const qrCode = new QRCodeStyling(options);
  qrCode.getRawData("png").then((buffer) => {
    console.log('Success! Buffer length:', buffer.length);
  }).catch(e => console.error(e));
} catch(e) {
  console.error(e);
}
