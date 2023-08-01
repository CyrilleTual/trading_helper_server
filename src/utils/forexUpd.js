import fetch from "node-fetch";
import { appCurrencies } from "../controller/currency.js";
import Query from "../model/query.js";

const API_KEY = "D94WMAY0HJ087NGM"; 
//const API_KEY = "PHJ9X4JNHL4U6KO8";  pas de mail valide lié

const BASE_FETCH_URL = "https://www.alphavantage.co/";

// on recupère la currency de base
const appCurrencyId = +process.env.APP_CURRENCY_ID;

// on recupère les differentes currencies
const currenciesArray = await appCurrencies();

// recupération des taux de change
async function getRates(from_currency, to_currency) {
  const res = await fetch(
    `${BASE_FETCH_URL}/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from_currency}&to_currency=${to_currency}&apikey=${API_KEY}`
  );
  const data = await res.json();

  if (data["Realtime Currency Exchange Rate"] === undefined){
    return "no_update";
  }

  //const rate = data["Realtime Currency Exchange Rate"]["9. Ask Price"];
  //const date = data["Realtime Currency Exchange Rate"]["6. Last Refreshed"]

  return data["Realtime Currency Exchange Rate"]["9. Ask Price"];
}

// mise à jour de la database
async function updDbForex(from_currency, to_currency, rate) {
  console.log(from_currency, to_currency, rate);

  // on teste si la ligne existe dans la db, on recupère l'id de la liste
  const query = `
        SELECT *  
        FROM  forex
        WHERE from_currency = ? AND to_currency = ? 
    `;
  const [result] = await Query.doByValues(query, {
    from_currency,
    to_currency,
  });

  if (result.length !== 0) {
    // la ligne existe, on recupère l'id e
    const forexId = result[0].id;
    // on effectue la mise à jour
    const query = `UPDATE forex
          SET rate=? 
          WHERE id = ?`;
    await Query.doByValues(query, {
      rate,
      forexId,
    });
  } else {
    // l'enregistrement n'existe pas -> création
    const query2 = `INSERT INTO forex (from_currency, to_currency, rate)
        VALUES (?,?,?)`;
    await Query.doByValues(query2, {
      from_currency,
      to_currency,
      rate,
    });
  }
}

export async function updCurrencies() {
  console.log(currenciesArray, appCurrencyId);
  // on recupère l'abbr de la devise de base pour setter from_currency
  const from_currency = currenciesArray.find(
    (el) => el.id === appCurrencyId
  ).abbr;

  // on parcours les devises et on va cherhcher le taux de change

  for (const elt of currenciesArray) {
    let to_currency = elt.abbr;
    const rate = await getRates(from_currency, to_currency);

    if (rate === "no_update") {
        console.log ("no Update available")
    } else {
        updDbForex(from_currency, to_currency, rate);
    }
  }
}
