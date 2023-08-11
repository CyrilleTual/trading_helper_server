 import { parentPort } from "worker_threads";
 import Query from "../model/query.js";
 import puppeteer from "puppeteer";
 import { extractDatasAbc } from "./scraper.js";

 (async () => {
   try {
     // Retrieve information of active stocks
     const query = `
        SELECT stock.id, stock.isin, stock.title, stock.ticker, stock.place, activeStock.lastQuote, activeStock.updDate
        FROM stock
        INNER JOIN activeStock ON stock.id = activeStock.stock_id
        `;
     const activeStocks = await Query.find(query);

     // Launch a headless browser instance
     const browser = await puppeteer.launch({
       headless: true, // Launch a browser without UI
     });

     let index = 0;
     // Loop through active stocks to retrieve and update data
     for await (const element of activeStocks) {
       index++;
       let { id, ticker, place } = element;
       let currentPage = await browser.newPage(); // Create a new page for each stock

       // Extract data from the page using extractDatasAbc function
       const {
         before,
         last: lastQuote,
         currency,
       } = await extractDatasAbc(currentPage, ticker, place);

       // Log extracted data for verification
       console.log(before, lastQuote, currency);

       // Get current timestamp
       let updDate = new Date();

       // Update data in the database
       const updateQuery = `UPDATE activeStock
          SET lastQuote=?, beforeQuote=?, updDate=?, currencySymbol=?
          WHERE stock_id = ?`;
       await Query.doByValues(updateQuery, {
         lastQuote,
         before,
         updDate,
         currency,
         id,
       });

       await currentPage.close(); // Close the page after usage
     }

     await browser.close(); // Close the browser instance

     // Send a completion message to the parent thread
     const message = "Task is done!";
     parentPort.postMessage(message);
   } catch (error) {
     console.log({ msg: error });
   }
 })();
