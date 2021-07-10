const fs = require('fs');
const barcode = require('bwip-js');
const PDFDocument = require('pdfkit');
const moment = require('moment-timezone');

const generateBarcodePng = (ticket) => {
  return new Promise((resolve, reject) => {
    barcode.toBuffer({
      bcid: 'code128',
      text: String(ticket.accessCode),
      scale: 3,               // 3x scaling factor
      height: 10,              // Bar height, in millimeters
      includetext: true,            // Show human-readable text
      textxalign: 'center',        // Always good to set this
      textsize: 13               // Font size, in points
    }, function (err, png) {
      if (err) {
        return reject(err);
      } else {
        return resolve(png);
      }
    });
  });
};

const generatePdfPage = async (ticket, png) => {
  return new Promise((resolve, reject) => {
    let doc = new PDFDocument();
    doc.image('./ticket.png', 10, 0, {width: 500});
    doc.font('./OpenSans-Bold.ttf');

    doc.fontSize(10)
      .text('Трибуна: ', 350, 45)
      .text('Сектор: ', 350, 65)
      .text('Ряд: ', 350, 85)
      .text('Место: ', 350, 105);

    doc.fontSize(14)
      .text(moment(ticket.match.date).tz("Europe/Kiev").format('DD.MM.YYYY HH:mm'), 8, 15, {align: 'center'});

    doc.fontSize(13)
      .text(ticket.match.headline, 20, 140, {align: 'center'})
      .text(translate(ticket.seat.tribune), 400, 42)
      .text(ticket.seat.sector, 400, 63)
      .text(ticket.seat.row, 400, 81)
      .text(ticket.seat.seat, 400, 102);

    doc.fontSize(9)
      .text('ОСК "Металлист"\n г. Харьков\n ул. Плехановская, 65\n \n Цена:  ' + ticket.amount + ' грн.', -245, 53, {align: 'center'});

    doc.rotate(90)
      .image(png, 25, -90, {width: 140});

    doc
      .fontSize(11)
      .text('vbet лига\n сезон 2021/22', -350, -510, {align: 'center'});

    doc.end();

    const buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });
  });
};

module.exports.send = async (event) => {
  try {
    const ticket = JSON.parse(event.body);
    const barcode = await generateBarcodePng(ticket);
    const data = await generatePdfPage(ticket, barcode);
    return generateResponse(200, data)
  } catch (err) {
    return generateError(500, err)
  }
};


const generateResponse = (code, data) =>({
  statusCode: code,
  isBase64Encoded: true,
  headers: {
    "Content-type": "application/pdf"
  },
  body: data.toString("base64")
})


const generateError = (code, err) => {
  console.log(err);
  return {
    statusCode: code,
    body: JSON.stringify(err.message)
  }
}

const translate = (direction) => {
  if (direction === 'north') { return 'Северная'}
  if (direction === 'south') { return 'Южная'}
  if (direction === 'east') { return 'Восточная'}
  if (direction === 'west') { return 'Западная'}
}
