import fetch from "node-fetch";
import { appCurrencies } from "../controller/currency.js";
import Query from "../model/query.js";

// Récupère l'ID de la devise de base de l'application
const appCurrencyId = global.appCurrency;

/**
 * Obtient les taux de change à partir d'une API en ligne.
 * @param {string} from_currency - La devise de base.
 * @param {string} to_currency - La devise secondaire.
 * @returns {Object|string} - Un objet contenant le taux de change et la date, ou "no_update".
 */
async function getRates(from_currency, to_currency) {
  try {
    const BASE_FETCH_URL = "https://www.alphavantage.co/";
    const API_KEY = "D94WMAY0HJ087NGM"; // Maximum 100 requêtes par jour

    // Effectue une requête pour obtenir les taux de change
    const res = await fetch(
      `${BASE_FETCH_URL}/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from_currency}&to_currency=${to_currency}&apikey=${API_KEY}`
    );
    const data = await res.json();

    // Gestion du cas où l'API est hors service ou le nombre de requêtes est dépassé
    if (data["Realtime Currency Exchange Rate"] === undefined) {
      return "no_update"; // Pas de mise à jour disponible
    }

    // Récupère le taux de change et la date de rafraîchissement
    const rate = data["Realtime Currency Exchange Rate"]["9. Ask Price"];
    const date = data["Realtime Currency Exchange Rate"]["6. Last Refreshed"];

    return { rate, date }; // Retourne un objet contenant le taux de change et la date
  } catch (error) {
    console.error("Erreur lors de la récupération des taux de change depuis l'API :", error);
    throw error; // Lance l'erreur pour gérer en amont si nécessaire
  }
}


/**
 * Met à jour les taux de change dans la base de données.
 * @param {string} from_currency - La devise de base.
 * @param {string} to_currency - La devise secondaire.
 * @param {number} rate - Le taux de change.
 * @param {Date} date - La date de mise à jour.
 */
async function updDbForex(from_currency, to_currency, rate, date) {
  try {
    // Conversion de la date au format local
    const dateInitial = new Date(date);
    const localDate = new Date(dateInitial.setMinutes(
      dateInitial.getMinutes() - dateInitial.getTimezoneOffset()
    ));

    // On vérifie si la ligne existe dans la base de données en fonction des devises
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
      // La ligne existe, on récupère l'identifiant
      const forexId = result[0].id;
      // On effectue la mise à jour
      const updateQuery = `
        UPDATE forex
        SET rate=?, date=?
        WHERE id = ?
      `;
      await Query.doByValues(updateQuery, {
        rate,
        localDate,
        forexId,
      });
    } else {
      // L'enregistrement n'existe pas -> création
      const insertQuery = `
        INSERT INTO forex (from_currency, to_currency, rate, date)
        VALUES (?,?,?,?)
      `;
      await Query.doByValues(insertQuery, {
        from_currency,
        to_currency,
        rate,
        localDate,
      });
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour des taux de change dans la base de données :", error);
  }
}



/**
 * Met à jour les taux de change pour toutes les devises dans la base de données.
 * Utilise la devise de base actuelle de l'application pour obtenir les taux.
 */
export async function updCurrencies() {
  try {
    // tableau des devises de l'application
    const currenciesArray = await appCurrencies();
    // Récupère l'abbréviation de la devise de base pour configurer from_currency
    // const from_currency = currenciesArray.find(
    //   (el) => el.id === appCurrencyId
    // ).abbr;
    const from_currency = global.appCurrency;

    // Parcours les devises et récupère les taux de change
    for (const elt of currenciesArray) {
      const to_currency = elt.abbr;

      // Obtient le taux de change actuel et la date de mise à jour
      const { rate, date } = await getRates(from_currency, to_currency);

      // Vérifie si le taux de change est indisponible
      if (rate === "no_update") {
        console.log("Forex : pas de mise à jour disponible");
      } else {
        // Met à jour la base de données avec le nouveau taux de change
        updDbForex(from_currency, to_currency, rate, date);
      }
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour des taux de change :", error);
  }
}
