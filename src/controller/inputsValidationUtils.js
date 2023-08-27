import {
  checkIfUserExistByEmail,
  portfoliosListByUser,
  strategiesIdsByUser,
  currenciesIds,
  stocksIds,
  verifyTrade,
} from "./controllerFunctionsUtils.js";

/**
 * Vérifie si les éléments d'un tableau sont des nombres positifs avec certaines contraintes.
 * @param {Array} arrayToCheck - Le tableau à vérifier.
 * @returns {string} - Message d'erreur ou chaîne vide.
 */
function checkNumbers(arrayToCheck) {

 
  for (const value of arrayToCheck) {
    if (
      isNaN(+value) || // Vérifie si c'est un nombre
      +value < 0 || // Vérifie qu'il n'est pas négatif
      +value > 9999999 //|| // Vérifie qu'il n'a pas plus de 7 chiffres
     // value * 1000 - Math.trunc(value * 1000) > 0 // Vérifie qu'il n'a pas plus de 3 décimales
    ) {
      // console.log(
      //   "probleme : ",
      //   value,
      //   value * 1000,
      //   Math.trunc(value * 1000), (value * 1000 - Math.trunc(value * 1000))
      // );
      return "Donnée numérique invalide";
    }
  }
  return ""; // Aucune erreur, retourne une chaîne vide
}

/**
 * Vérifie les données d'entrée pour l'inscription.
 *
 * @param {*} inputs - Les données d'entrée à vérifier (email, pwd, alias).
 * @returns {Object} - Un objet contenant les erreurs éventuelles et les valeurs vérifiées.
 */
export async function signupInputCheck(inputs) {
  const { email, pwd, alias } = inputs;
  const inputsErrors = []; // Tableau pour stocker les erreurs d'entrée
  let verifiedValues = {}; // Objet pour stocker les valeurs vérifiées

  // Vérification de l'email
  const cleanEmail = email.trim().toLowerCase();

  const regex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/i;
  if (!regex.test(cleanEmail)) {
    inputsErrors.push("Email non valide");
  }

  // Vérification de l'absence de doublon pour l'email
  if (await checkIfUserExistByEmail(cleanEmail)) {
    inputsErrors.push("Email non disponible");
  }

  // Vérification de l'alias
  const cleanAlias = alias.trim();
  // Vérification de la longueur du commentaire
  if (cleanAlias.length > 100 || cleanAlias.length < 3) {
    inputsErrors.push("Alias non valide");
  }

  // Vérification du mot de passe
  const cleanPwd = pwd.trim();
  // Vérification de la longueur
  if (cleanPwd.length > 30 || cleanPwd.length < 8) {
    inputsErrors.push("Mot de passe non valide");
  }

  // Stockage des valeurs vérifiées dans l'objet
  verifiedValues = {
    alias: cleanAlias,
    pwd: cleanPwd,
    email: cleanEmail,
  };

  return { inputsErrors, verifiedValues }; // Renvoi des erreurs et des valeurs vérifiées
}

/**
 * Vérifie les données d'entrée pour le login
 *
 * @param {*} inputs - Les données d'entrée à vérifier (email, pwd ).
 * @returns {Object} - Un objet contenant les erreurs éventuelles et les valeurs vérifiées.
 */
export async function signinInputCheck(inputs) {
  const { email, pwd } = inputs;
  const inputsErrors = []; // Tableau pour stocker les erreurs d'entrée
  let verifiedValues = {}; // Objet pour stocker les valeurs vérifiées

  // Vérification de l'email
  const cleanEmail = email.trim().toLowerCase();

  const regex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/i;
  if (!regex.test(cleanEmail)) {
    inputsErrors.push("Email non valide");
  }

  // Vérification du mot de passe
  const cleanPwd = pwd.trim();
  // Vérification de la longueur
  if (cleanPwd.length > 30) {
    inputsErrors.push("Mot de passe non valide");
  }

  // Stockage des valeurs vérifiées dans l'objet
  verifiedValues = {
    pwd: cleanPwd,
    email: cleanEmail,
  };

  return { inputsErrors, verifiedValues }; // Renvoi des erreurs et des valeurs vérifiées
}

/**
 * Vérifie les données d'entrée pour un nouveau trade
 *
 * @param {*} inputs - Les données d'entrée à vérifier (email, pwd ).
 * @returns {Object} - Un objet contenant les erreurs éventuelles et les valeurs vérifiées.
 */
export async function newEntryInputCheck(inputs, res) {
  const inputsErrors = []; // Tableau pour stocker les erreurs d'entrée
  let verifiedValues = {}; // Objet pour stocker les valeurs vérifiées
  const {
    stock_id,
    price,
    target,
    stop,
    quantity,
    fees,
    tax,
    comment,
    strategy_id,
    portfolio_id,
    currency_id,
    lastQuote,
    beforeQuote,
    position,
  } = inputs;

  // Vérification que les champs numériques sont bien numériques et non négatifs
  const mustBeNumbers = [
    price,
    quantity,
    target,
    stop,
    fees,
    tax,
    beforeQuote,
    lastQuote,
    portfolio_id,
    strategy_id,
    currency_id,
    stock_id,
  ];





  const numberError = checkNumbers(mustBeNumbers);
  if (numberError.length > 0) {
    inputsErrors.push(numberError);
  }


  //// verification de l'input "position" ////////////////////
  if (position !== "short" && position !== "long") {
    inputsErrors.push("Position incorecte");
  }

  //// verification de l'input "comment ////////////////////
  const cleanComment = comment.trim();
  // Vérification de la longueur
  if (cleanComment.length > 255) {
    inputsErrors.push("commentaire non valide");
  }

  // verification que le portfolio appartient bien à l'user ////////
  const userId = res.locals.datas.userId; //recupère l'id du user (recup d'aprés le token reçu et validé)
  const portfoliosOfUser = await portfoliosListByUser(userId); // recupération de la liste des portofolios
  if (
    portfoliosOfUser.find((portfolio) => portfolio.id === portfolio_id) ===
    undefined
  ) {
    inputsErrors.push("Portefeuille invalide");
  }

  // verification que la stratégie appartient bien à l'user ////////
  const strategiesOfUser = await strategiesIdsByUser(userId);
  if (
    strategiesOfUser.find((strategy) => strategy.id === strategy_id) ===
    undefined
  ) {
    inputsErrors.push("Strategie invalide");
  }

  // verification de l'existance de la devise ////////////////////
  const currencies = await currenciesIds();
  if (
    currencies.find((currency) => currency.id === currency_id) === undefined
  ) {
    inputsErrors.push("Devise invalide");
  }

  // verification de l'existance de l'id du stock  ///////////////
  const stocks = await stocksIds();
  if (stocks.find((stock) => stock.id === stock_id) === undefined) {
    inputsErrors.push("Support invalide");
  }

  // Stockage des valeurs vérifiées dans l'objet
  verifiedValues = {
    stock_id: +stock_id,
    price: +price,
    target: +target,
    stop: +stop,
    quantity: +quantity,
    fees: +fees,
    tax: +tax,
    comment: cleanComment,
    strategy_id: +strategy_id,
    portfolio_id: +portfolio_id,
    currency_id: +currency_id,
    lastQuote: +lastQuote,
    beforeQuote: +beforeQuote,
    position: position,
  };

  return { inputsErrors, verifiedValues }; // Renvoi des erreurs et des valeurs vérifiées
}

/**
 * Vérifie les données d'entrée pour un re enter
 * @param {*} inputs - Les données d'entrée à vérifier .
 * @returns {Object} - Un objet contenant les erreurs éventuelles et les valeurs vérifiées.
 */
export async function reEnterInputCheck(inputs, res) {
  const inputsErrors = []; // Tableau pour stocker les erreurs d'entrée
  let verifiedValues = {}; // Objet pour stocker les valeurs vérifiées
  const userId = res.locals.datas.userId; //recupère l'id du user (recup d'aprés le token reçu et validé)
  const {
    price,
    target,
    stop,
    quantity,
    fees,
    tax,
    trade_id,
    stock_id,
    comment,
    date,
  } = inputs;

  // Vérification que les champs numériques sont bien numériques et non négatifs
  const mustBeNumbers = [
    price,
    target,
    stop,
    quantity,
    fees,
    tax,
    trade_id,
    stock_id,
  ];

  const numberError = checkNumbers(mustBeNumbers);
  if (numberError.length > 0) {
    inputsErrors.push(numberError);
  }

  // verification que le trade existe et est bien lié au stock et à l'user
  const trade = await verifyTrade(trade_id, stock_id, userId);
  if (trade.length === 0) {
    inputsErrors.push("Requête invalide");
  }

  //// verification de l'input "comment ////////////////////
  const cleanComment = comment.trim();
  if (cleanComment.length > 255) {
    inputsErrors.push("commentaire non valide");
  }

  // vérification du format de la date ////////////////////////////
  if (isNaN(new Date(date).getTime())) {
    inputsErrors.push("Date non valide");
  }

  // Stockage des valeurs vérifiées dans l'objet
  verifiedValues = {
    date: date,
    price: +price,
    target: +target,
    stop: +stop,
    quantity: +quantity,
    fees: +fees,
    tax: +tax,
    comment: cleanComment,
    trade_id: +trade_id,
    stock_id: +stock_id,
  };

  return { inputsErrors, verifiedValues }; // Renvoi des erreurs et des valeurs vérifiées
}

/**
 * Vérifie les données d'entrée pour un exit
 *
 * @param {*} inputs - Les données d'entrée à vérifier (email, pwd ).
 * @returns {Object} - Un objet contenant les erreurs éventuelles et les valeurs vérifiées.
 */
export async function exitInputCheck(inputs, res) {
  const inputsErrors = []; // Tableau pour stocker les erreurs d'entrée
  let verifiedValues = {}; // Objet pour stocker les valeurs vérifiées
  const userId = res.locals.datas.userId; //recupère l'id du user (recup d'aprés le token reçu et validé)
  const {
    comment,
    date,
    fees,
    price,
    quantity,
    remains,
    stock_id,
    tax,
    trade_id,
  } = inputs;

  // Vérification que les champs numériques sont bien numériques et non négatifs
  const mustBeNumbers = [
    fees,
    price,
    quantity,
    remains,
    stock_id,
    tax,
    trade_id,
  ];
  const numberError = checkNumbers(mustBeNumbers);
  if (numberError.length > 0) {
    inputsErrors.push(numberError);
  }

  // vérification concordance remains et quantity ////////////////////////////
  if (quantity > remains) {
    inputsErrors.push("Données non concordantes");
  }

  //// verification de l'input "comment ////////////////////
  const cleanComment = comment.trim();
  if (cleanComment.length > 255) {
    inputsErrors.push("commentaire non valide");
  }

  // vérification du format de la date ////////////////////////////
  if (isNaN(new Date(date).getTime())) {
    inputsErrors.push("Date non valide");
  }

  // verification que le trade existe et est bien lié au stock et à l'user
  const trade = await verifyTrade(trade_id, stock_id, userId);
  if (trade.length === 0) {
    inputsErrors.push("Requête invalide");
  }

  // Stockage des valeurs vérifiées dans l'objet
  verifiedValues = {
    comment: cleanComment,
    date: date,
    fees: +fees,
    price: +price,
    quantity: +quantity,
    remains: +remains,
    stock_id: +stock_id,
    tax: +tax,
    trade_id: +trade_id,
  };

  return { inputsErrors, verifiedValues }; // Renvoi des erreurs et des valeurs vérifiées
}

export async function depositInputCheck(inputs, res) {
  const inputsErrors = []; // Tableau pour stocker les erreurs d'entrée
  let verifiedValues = {}; // Objet pour stocker les valeurs vérifiées
  const userId = res.locals.datas.userId; //recupère l'id du user (recup d'aprés le token reçu et validé)
  const { portfolioId, action, amount } = inputs;

  // Vérification que les champs numériques sont bien numériques et non négatifs
  const mustBeNumbers = [portfolioId, amount];
  const numberError = checkNumbers(mustBeNumbers);
  if (numberError.length > 0) {
    inputsErrors.push(numberError);
  }

  // verification de l'action
  if (action !== 1 && action !== 2) {
    inputsErrors.push("Requête invalide");
  }

  // Stockage des valeurs vérifiées dans l'objet
  verifiedValues = { portfolioId, action: +action, amount: +amount };

  // verification que le portfolio appartient bien à l'user ////////
  const portfoliosOfUser = await portfoliosListByUser(userId); // recupération de la liste des portofolios
  if (
    portfoliosOfUser.find((portfolio) => portfolio.id === portfolioId) ===
    undefined
  ) {
    inputsErrors.push("Portefeuille invalide");
  }

  // Stockage des valeurs vérifiées dans l'objet
  verifiedValues = {
    portfolioId: +portfolioId,
    action: +action,
    amount: +amount,
  };

  return { inputsErrors, verifiedValues }; // Renvoi des erreurs et des valeurs vérifiées
}

export async function idleInputCheck(inputs, res) {
  const inputsErrors = []; // Tableau pour stocker les erreurs d'entrée
  let verifiedValues = {}; // Objet pour stocker les valeurs vérifiées
  const userId = res.locals.datas.userId; //recupère l'id du user (recup d'aprés le token reçu et validé)
  const { portfolioId } = inputs;

  // verification que le portfolio appartient bien à l'user ////////
  const portfoliosOfUser = await portfoliosListByUser(userId); // recupération de la liste des portofolios
  if (
    portfoliosOfUser.find((portfolio) => portfolio.id === portfolioId) ===
    undefined
  ) {
    inputsErrors.push("Portefeuille invalide");
  }
  // Stockage des valeurs vérifiées dans l'objet
  verifiedValues = {
    portfolioId: +portfolioId,
  };

  return { inputsErrors, verifiedValues }; // Renvoi des erreurs et des valeurs vérifiées
}

/**
 * Vérifie les entrées pour la création d'un nouveau portfolio.
 * @param {Object} inputs - Les données d'entrée.
 * @param {Response} res - L'objet de la réponse HTTP.
 * @returns {Object} - Erreurs d'entrée et valeurs vérifiées.
 */
export async function newPortfolioInputCheck(inputs, res) {
  const inputsErrors = []; // Tableau pour stocker les erreurs d'entrée
  let verifiedValues = {}; // Objet pour stocker les valeurs vérifiées
  const userId = res.locals.datas.userId; //recupère l'id du user (recup d'aprés le token reçu et validé)
  const { title, comment, deposit, user_id, currency_id, status } = inputs;

  // Vérification que les champs numériques sont bien numériques et non négatifs
  const mustBeNumbers = [deposit, user_id, currency_id];
  const numberError = checkNumbers(mustBeNumbers);
  if (numberError.length > 0) {
    inputsErrors.push(numberError);
  }

  //// verification de l'input "comment ////////////////////
  const cleanComment = comment.trim();
  if (cleanComment.length > 255) {
    inputsErrors.push("commentaire non valide");
  }

  //// verification de l'input "title /////////////////////////////
  const cleanTitle = title.trim();
  if (cleanTitle.length > 100) {
    inputsErrors.push("Nom non valide");
  }

  //// verification du status /////////////////////////////////////
  const cleanStatus = status.trim();
  // Vérification de la longueur
  if (cleanStatus !== "active" && cleanStatus !== "idle") {
    inputsErrors.push("Statut non valide");
  }

  // Vérification de l'existence de la devise
  const currencies = await currenciesIds();
  if (!currencies.some((currency) => currency.id === currency_id)) {
    inputsErrors.push("Devise invalide");
  }

  // verifiction de l'identité de l'utilisateur ///////////////////
  if (user_id !== res.locals.datas.userId) {
    inputsErrors.push("Requête invalide.");
  }

  // Stockage des valeurs vérifiées dans l'objet
  verifiedValues = {
    title: cleanTitle,
    comment: cleanComment,
    deposit: +deposit,
    user_id,
    currency_id,
    status: cleanStatus,
  };

  return { inputsErrors, verifiedValues }; // Renvoi des erreurs et des valeurs vérifiées
}
