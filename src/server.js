import express from "express";
import "dotenv/config";
import cors from "cors";
import router from "./router/index.routes.js";
import morgan from "morgan";
import  rfs from "rotating-file-stream"
import fs from 'fs'; 


import { LOCAL_PORT } from "./config/const.js"; //  variables d'environnement
import { updQuote } from "./utils/cronUpdQuote.js";
import { updCurrencies } from "./utils/forexUpd.js";

const PORT = process.env.PORT || LOCAL_PORT;
const app = express();


// create a rotating write stream
const accessLogStream = rfs.createStream('access.log', {
  interval: '1d', // rotate daily
  path:('./src/log')
})

app
  .use(cors({ origin: "*" }))
  .use(express.static("public"))
  .use(express.json()) // basé sur body-parse rôle pour le json
  .use(express.urlencoded({ extended: true })) // aussi basé sur body parser
  .use(morgan("combined", { stream: accessLogStream })) // log des requêtes vers le serveur
  .use(router)

  .listen(PORT, (err) => {
    err
      ? console.log(err)
      : console.log(`Listening at http://${process.env.HOSTNAME}:${PORT}`);
  });
//

console.log("starting cron job ");
updQuote(); // lance le CRON pour update activeStock
updCurrencies();
