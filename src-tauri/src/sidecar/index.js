const server = require("http").createServer();
const io = require('socket.io')(server, {
  maxHttpBufferSize: 9e9
});
const fs = require("fs");
const path = require("path");
const sql = require('mssql');
const axios = require("axios").default;
const pdf2pic = require("pdf-img-convert");
const { API } = require("../node_hqa");

let prom = sql.connect("SERVER=tcp:192.168.111.215\\REALTRACSQL;UID=realtracsql;PWD=realtracsql;DATABASE=Realtrac;TrustServerCertificate=true")

io.on('connection', client => {
  console.log("connected")
  client.on('sql_get', async (query, callback) => {
    await prom;
    callback(await sql.query(query))
  });
  client.on('pdf2pic', async ({ job, guids }, callback) => {
    let files = await Promise.all(guids.map(async guid => {
      let query1 = API("filestorage/token");
      let query2 = API("filestorage/download");
      query1.req["GUID"] = guid;
      query2.req["Token"] = (await query1.send())["Token"];
      let buffer = await query2.pdf();
      try {
        return await pdf2pic.convert(buffer, {
          height: 1000
        });
        /*
        for (let drawing of drawings) {
          fs.writeFileSync(path.join(cache, drawing.guid + ".png"), imgs[drawing.pageNo - 1]);
        }
        */
      } catch (e) {
        console.log(e);
        return [];
      }
    }))
    $.socket.emit("pdfdone", { job, files });
  });
  client.on('highqa', async (query, callback) => {
    callback(await axios({

    }))
  });
});

server.listen(8084);