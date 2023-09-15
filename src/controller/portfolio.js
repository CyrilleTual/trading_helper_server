import Query from "../model/query.js";
import { appCurrencies, appGetForex } from "../controller/currency.js";
import { feedPortfolio } from "./deposit.js";
import {
  depositInputCheck,
  idleInputCheck,
  newPortfolioInputCheck,
} from "./inputsValidationUtils.js";

/**
 * Création d'un nouveau portefeuille puis versement initial attaché au portefeuille crée.
 * @param {Request} req - Requête HTTP.
 * @param {Response} res - Réponse HTTP.
 */
export const newPortfolio = async (req, res) => {
  try {

    const { inputsErrors, verifiedValues } = await newPortfolioInputCheck(req.body, res);

    if (inputsErrors.length > 0) {
      // il y a des erreurs
      res.status(403).json({
        msg: "Requête incorrecte, création rejetée",
      });
      return;
    } else {
      const { title, comment, deposit, user_id, currency_abbr, status } =
        verifiedValues;
      // Requête d'insertion pour créer un nouveau portefeuille dans la base de données
      const query = `
        INSERT INTO portfolio (title, comment, user_id,currency_abbr, status  ) 
        VALUES (?,?,?,?,?)
      `;

      //Exécution de la requête d'insertion et récupération du résultat
      const [result] = await Query.doByValues(query, {
        title,
        comment,
        user_id,
        currency_abbr,
        status,
      });

      // Obtention de l'ID du portefeuille nouvellement créé
      const idPort = await result.insertId;

      // Appel de la fonction feedPortfolio pour effectuer un versement initial
      feedPortfolio(idPort, deposit);

      // Réponse indiquant que le portefeuille a été créé avec succès
      res.status(200).json({ msg: "Portefeuille créé avec succès." });
    }
  } catch (error) {
    // En cas d'erreur, renvoyer un message d'erreur dans la réponse
    res.json({ msg: error });
  }
};


/**
 * Effectue un dépôt (ou un retrait) sur un portefeuille.
 * 
 * @param {Request} req - Requête HTTP.
 * @param {Response} res - Réponse HTTP.
 */
export const deposit = async (req, res) => {
  try {
    const { inputsErrors, verifiedValues } = await depositInputCheck(
      req.body,
      res
    );
    if (inputsErrors.length > 0) {
      // il y a des erreurs
      res.status(403).json({
        msg: "Requête incorrecte, création rejetée",
      });
      return;
    } else {
      const { portfolioId, action, amount } = verifiedValues;
      // Calcul du montant à insérer en fonction de l'action (dépôt ou retrait)
      const amountToInsert = action === 2 ? -amount : amount;

      // Appel de la fonction feedPortfolio pour mettre à jour le portefeuille
      feedPortfolio(portfolioId, amountToInsert);

      // Réponse indiquant que l'opération de dépôt/retrait a été effectuée avec succès
      res
        .status(200)
        .json({ msg: "Opération de versement effectuée avec succès." });
    }
  } catch (error) {
    // En cas d'erreur, renvoyer un message d'erreur dans la réponse
    res.json({ msg: error });
  }
};


/**
 * Récupère la liste des portefeuilles et leurs caractéristiques pour un utilisateur donné (userId).
 * 
 * @param {*} userId - Identifiant de l'utilisateur.
 * @returns {Array} - Liste des portefeuilles pour l'utilisateur.
 */
async function portfoliosByUser(userId) {

  // Requête SQL pour récupérer les informations des portefeuilles d'un utilisateur donné
  const query = `
    SELECT portfolio.id, portfolio.title, portfolio.comment, currency.abbr as currencyAbbr, currency.title as currency, currency.symbol as symbol, currency.abbr as abbr, portfolio.status as status
    FROM portfolio
    JOIN currency ON portfolio.currency_abbr = currency.abbr
    WHERE user_id = ?
  `;

  // Exécute la requête pour obtenir la liste des portefeuilles et leurs caractéristiques pour un utiliateur
  const portfolios = await Query.doByValue(query, userId);

  return portfolios;
}


/**
 * Marque un portefeuille comme inactif.
 * 
 * @param {Request} req - Requête HTTP.
 * @param {Response} res - Réponse HTTP.
 */
export const idlePortfolio = async (req, res) => {

  const { inputsErrors, verifiedValues } = await idleInputCheck(req.body, res);

  if (inputsErrors.length > 0) {
    // il y a des erreurs
    res.status(403).json({
      msg: "Requête incorrecte",
    });
    return;
  } else {
    // Récupération de l'identifiant du portefeuille à rendre inactif depuis les paramètres de la requête
    const { idPortfolio, status } = verifiedValues;
    const newStatus = status === 'active' ? 'idle' : 'active';
    try {
      // Requête SQL pour mettre à jour le statut du portefeuille en 'idle'
      const query = `
        UPDATE portfolio 
        SET status=?
        WHERE id =? 
      `;
      // Exécution de la requête pour marquer le portefeuille comme inactif
      await Query.doByValues(query, {newStatus, idPortfolio});

      // Réponse indiquant que le portefeuille a été rendu inactif avec succès
      res.status(200).json({ msg: "statut modifé avec succès." });
    } catch (error) {
      // En cas d'erreur, renvoyer un message d'erreur dans la réponse
      res.json({ msg: error });
    }
  }
};


/**
 * Récupère les portefeuilles d'un utilisateur spécifique (route /portfolios/user/:userId) .
 * 
 * @param {Request} req - Requête HTTP.
 * @param {Response} res - Réponse HTTP.
 */
export const getPortfoliosByUser = async (req, res) => {

  // recupère l'id de l'uder depuis les paramètres de la requête
  const { userId } = req.params;
  try {
    // Appelle la fonction portfoliosByUser pour récupérer les portefeuilles de l'utilisateur
    const portfolios = await portfoliosByUser(userId);
    
    // Répond avec un statut 200 (OK) et renvoie la liste des portefeuilles au format JSON
    res.status(200).json(portfolios);
  } catch (error) {
    // En cas d'erreur, renvoie un message d'erreur au format JSON
    res.json({ msg: error });
  }
};

 


/**
 * informations sur un portfolio par id
 * @param {number} id - L'ID du portefeuille.
 * @returns {object} - Objet contenant les informations du portefeuille
 */
const portfolioInfos = async (id) => {

  // Requète  SQL pour recupérer les information sur un portfolio par son id
  const query = `
   SELECT title, comment, user_id as userId, currency_abbr as currencyAbbr
   FROM portfolio 
   WHERE  id=?
  `;

  // Exucution de la requête
  const result = await Query.doByValue(query, id);

  
  return result[0];
};

//**********************************************************
//* Determination de l'apport total de cash pour un portfolio
//*
const initial = async (id) => {
  const query = `
   SELECT SUM(deposit.amount) as totalDeposit 
   FROM deposit 
   WHERE  deposit.porfolio_id=?
  `;
  const result = await Query.doByValue(query, id);

  return result[0].totalDeposit;
};


/**
 * Récupère la liste de tous les trades ouverts pour un portefeuille donné.
 * @param {number} idPortfolio - L'ID du portefeuille.
 * @returns {Promise<Array>} - Une promesse résolvant en un tableau de trades ouverts.
 */
async function opened(idPortfolio) {

  // Requête SQL pour obtenir les détails des trades ouverts pour le portefeuille donné
  const query = `
    select enter.trade_id as tradeId, SUM(enter.quantity) as quantity, SUM(price*quantity) as totalEnterK, SUM(fees+tax) as totalEnterTaxs, trade.position
    FROM enter
    JOIN trade ON trade.id = enter.trade_id
    WHERE trade.portfolio_id =? 
    GROUP By enter.trade_id
`;

  // Exécution de la requête SQL pour obtenir les trades ouverts
  const opened = await Query.doByValue(query, idPortfolio);

  return opened;
}


/**
 * Sélectionne tous les trades fermés pour un portefeuille donné.
 * Retourne l'ID du trade, la quantité de sortie et le prix de sortie total (incluant les taxes).
 * @param {number} idPortfolio - L'ID du portefeuille.
 * @returns {Promise<Array>} - Une promesse résolvant en un tableau de trades long fermés.
 */
const closed = async (idPortfolio) => {

  // Requête SQL pour obtenir les détails des tradesfermés pour le portefeuille donné
  const query = `
    select closure.trade_id as tradeId, SUM(closure.quantity) as quantity, 
    SUM(fees+tax) as totalExitTaxs,
    SUM(price*quantity) as totalExitPrice
    FROM closure
    JOIN trade ON trade.id = closure.trade_id
    WHERE trade.portfolio_id =?  
    GROUP By closure.trade_id
  `;

  // Exécution de la requête SQL pour obtenir les trades fermés  et
  // et retourne le resultat
  return await Query.doByValue(query, idPortfolio);
};


/**
 * Récupère les détails d'un trade actif à partir de son ID.
 * @param {number} idTrade - L'ID du trade.
 * @param {number} prutmp - Valeur par défaut en cas d'erreur.
 * @returns {Promise<Array>} - Une promesse résolvant en un tableau de détails du trade actif.
 */
const detailsCurrentTrade = async (idTrade, prutmp) => {
  // Requête SQL pour obtenir les détails du trade actif à partir de son ID
  const query = `
    SELECT trade.currentTarget, trade.currentStop, stock.title, activeStock.lastQuote, activeStock.beforeQuote
    FROM trade
    JOIN stock ON trade.stock_id = 	stock.id
    JOIN activeStock ON stock.id = activeStock.stock_id
    WHERE trade.id = ? 
  `;

  // Exécution de la requête SQL pour obtenir les détails du trade actif
  const result = await Query.doByValue(query, idTrade);

  // Si aucun résultat n'a été trouvé, ajouter une entrée d'erreur avec les valeurs par défaut
  if (result.length === 0) {
    result.push({
      currentTarget: prutmp,
      currentStop: prutmp,
      title: "Error loading",
      lastQuote: prutmp,
      beforeQuote: prutmp,
    });
  }

  // retourne tableau de détail des trades actifs 
  return result;
};

/**
 * Récupère les détails des trades à partir des tableaux des entrées et des sorties.
 * @param {Array} opened - Tableau des trades ouverts.
 * @param {Array} closed - Tableau des trades fermés.
 * @returns {Object} - Un objet contenant les détails des trades actifs et fermés.
 */
async function getDetails(opened, closed) {
  
  let activesTrades = [];
  let closedTrades = [];

  // Construction des tableaux des trades actifs et celui des trades fermés
  for (const element1 of opened) {  // on boucle sur chaque trade ouvert
    let remains = 0;
    let flag = false;

    for (const element2 of closed) { // on boucle sur chaque trade fermé
      if (element2.tradeId === element1.tradeId) { // si il y a correspondance des id
        flag = true; // il existe une clôture pour ce trade
        remains = +element1.quantity - element2.quantity; 
        if (remains > 0) { // la sortie est partielle -> le trade est encore actif
          activesTrades.push({
            tradeId: element1.tradeId,
            position: element1.position,
            bougth: +element1.quantity,
            enterK: +element1.totalEnterK,
            enterTaxs: +element1.totalEnterTaxs,
            remains: +remains,
            sold: +element2.quantity,
            exitK: +element2.totalExitPrice,
            exitTaxs: +element2.totalExitTaxs,
          });
        } else {
          // le trade n'est plus actif
          closedTrades.push({
            tradeId: element1.tradeId,
            position: element1.position,
            bougth: +element1.quantity,
            enterK: +element1.totalEnterK,
            enterTaxs: +element1.totalEnterTaxs,
            remains: +remains,
            sold: +element2.quantity,
            exitK: +element2.totalExitPrice,
            exitTaxs: +element2.totalExitTaxs,
          });
        }
      }
    }

        if (flag === false) {
        // pas de cloture pour ce trade
      activesTrades.push({
        tradeId: element1.tradeId,
        position: element1.position,
        bougth: element1.quantity,
        enterK: element1.totalEnterK,
        enterTaxs: element1.totalEnterTaxs,
        remains: +element1.quantity,
        sold: 0,
        exitK: 0,
        exitTaxs: 0,
      });
    }
  }

  // pour chaque trade ACTIF  -> infos actuelles sur target/objectif/ cours jour et précédent
  const activesDetails = [];
  for (const element of activesTrades) {
    // on passe le pru pour permettre de définir une valeur par defaut si
    // pas de titre dans la DataBase
    const prutmp = +((+element.enterK + +element.enterTaxs) / +element.bougth);

    const [details] = await detailsCurrentTrade(element.tradeId, prutmp);

    activesDetails.push({ ...element, ...details });
  }
  return { activesDetails, closedTrades };
}

/**
 * Calcule le solde des trades actifs.
 * @param {Array} activesDetails - Détails des trades actifs.
 * @returns {Object} - Le solde des trades actifs.
 */
function balanceOfActivestrades(activesDetails) {
  const balanceActives = {
    activeK: 0,
    currentPv: 0,
    potential: 0,
    perfIfStopeed: 0,
    dailyVariation: 0,
    assets: 0,
    cash: 0,
  };

  for (const element of activesDetails) {
    // Calcul du nombre d'actions actives
    const nbActivesShares = +element.bougth - +element.sold;
    const pru = +((+element.enterK + +element.enterTaxs) / +element.bougth); // pru si long ou garantie si short

    // Calcul du capital investi dans chaque trade ( ce qui sort du wallet)
    const activeK = pru * nbActivesShares;
    balanceActives.activeK += activeK;

    // Calcul de la valeur actuelle (+/-) des positions actives
    const pv =
      element.position === "long"
        ? nbActivesShares * (element.lastQuote - pru)
        : nbActivesShares *
          ((+element.enterK - +element.enterTaxs) / +element.bougth -
            +element.lastQuote);
    balanceActives.currentPv += pv;

    // Calcul du potentiel restant sur les positions actives
    const remains =
      nbActivesShares *
      (element.position === "long"
        ? element.currentTarget - element.lastQuote
        : element.lastQuote - element.currentTarget);
    balanceActives.potential += remains;

    // Calcul de la performance en cas de déclenchement du stop (risque) en valeur
    const perfIfStopped =
      element.position === "long"
        ? nbActivesShares * (+element.currentStop - pru)
        : nbActivesShares *
            (+element.enterK / +element.bougth - +element.currentStop) -
          +element.enterTaxs;
    balanceActives.perfIfStopeed += perfIfStopped;

    // Calcul de la variation quotidienne = valorisation du jour - valorisation de la veille
    const delta =
      element.position === "long"
        ? (element.lastQuote - element.beforeQuote) * nbActivesShares
        : -(element.lastQuote - element.beforeQuote) * nbActivesShares;
    balanceActives.dailyVariation += delta;

    // Calcul de la valeur potentielle des actifs actifs si vente
    const assets =
      element.position === "long"
        ? +nbActivesShares * +element.lastQuote
        : +nbActivesShares *
          (+element.enterK / +element.bougth -
            +element.lastQuote +
            +element.enterK / +element.bougth);
    balanceActives.assets += +assets;

    // Calcul des mouvements de trésorerie dans le portefeuille (gains provenant de la vente d'actifs)
    balanceActives.cash +=
      -element.enterK - +element.enterTaxs + +element.exitK - +element.exitTaxs;
  }

  // Arrondir la valeur des actifs à deux décimales
  balanceActives.assets = +balanceActives.assets.toFixed(2);

  return balanceActives;
}

/**
 * Construit le tableau de bord du portefeuille.
 * @param {Object} portfolioDash - Tableau de bord du portefeuille.
 * @param {Object} balanceActives - Solde des trades actifs.
 * @param {Array} closedTrades - Liste des trades clôturés.
 * @returns {Object} - Le tableau de bord mis à jour.
 */
function feedDashboard(portfolioDash, balanceActives, closedTrades) {

  portfolioDash.currentPv = +balanceActives.currentPv.toFixed(2);
  portfolioDash.activeK = +balanceActives.activeK.toFixed(2);
  portfolioDash.currentPvPc =
    balanceActives.activeK !== 0
      ? +((balanceActives.currentPv / balanceActives.activeK) * 100).toFixed(2)
      : 0;
  portfolioDash.potential = +balanceActives.potential.toFixed(2);
  portfolioDash.potentialPc =
    balanceActives.activeK !== 0
      ? +((balanceActives.potential / balanceActives.activeK) * 100).toFixed(2)
      : 0;
  portfolioDash.perfIfStopeed = +balanceActives.perfIfStopeed.toFixed(2);
  portfolioDash.perfIfStopeedPc =
    balanceActives.activeK !== 0
      ? +(
          (balanceActives.perfIfStopeed / balanceActives.activeK) *
          100
        ).toFixed(2)
      : 0;
  portfolioDash.dailyVariation = +balanceActives.dailyVariation.toFixed(2);
  portfolioDash.dailyVariationPc =
    balanceActives.activeK !== 0
      ? +(
          (balanceActives.dailyVariation / balanceActives.activeK) *
          100
        ).toFixed(2)
      : 0;
  portfolioDash.assets = +balanceActives.assets;

  // pour la suite on intègre les  positions clôturées qui vont influer sur la cash du portfolio
  let closedTradesCash = 0;
  for (const element of closedTrades) {
    closedTradesCash +=
      -element.enterK - +element.enterTaxs + +element.exitK - +element.exitTaxs;
  }
  portfolioDash.cash = +(
    +portfolioDash.initCredit +
    closedTradesCash +
    balanceActives.cash
  ).toFixed(2);

  portfolioDash.totalBalance = +(
    +portfolioDash.assets + portfolioDash.cash
  ).toFixed(2);

  portfolioDash.totalPerf = +(
    +portfolioDash.totalBalance - portfolioDash.initCredit
  ).toFixed(2);

  portfolioDash.totalPerfPc =
    portfolioDash.initCredit !== 0
      ? +(
          ((+portfolioDash.totalBalance - portfolioDash.initCredit) /
            +portfolioDash.initCredit) *
          100
        ).toFixed(2)
      : 0
  ;

  return portfolioDash;
}

/***********************************************************
 * On recupère le tableau de bord d'un portfolio particulier (portfolioId)
 */
async function portfolioDashboard(portfolioId) {

  const portfolioDash = {
    id: portfolioId, // Identifiant du portefeuille
    currentPv: 0, // Valeur actuelle du portefeuille (P&L actuel)
    currentPvPc: 0, // Pourcentage de la valeur actuelle par rapport au capital engagé
    potential: 0, // Potentiel restant du portefeuille (P&L potentiel)
    potentialPc: 0, // Pourcentage du potentiel par rapport au capital engagé
    perfIfStopeed: 0, // Performance attendue si le stop est touché (P&L potentiel en cas de stop)
    perfIfStopeedPc: 0, // Pourcentage de la performance en cas de stop par rapport au capital engagé
    dailyVariation: 0, // Variation quotidienne du portefeuille en valeur
    dailyVariationPc: 0, // Pourcentage de la variation quotidienne par rapport à la valeur actuelle
    initCredit: 0, // Crédit initial du portefeuille
    assets: 0, // Valeur totale des actifs du portefeuille
    cash: 0, // Liquidités disponibles dans le portefeuille
    totalBalance: 0, // Solde total du portefeuille (actifs + liquidités)
    totalPerf: 0, // Performance totale du portefeuille (solde total - crédit initial)
    totalPerfPc: 0, // Pourcentage de la performance totale par rapport au crédit initial
    currencyAbbr: "", // Identifiant de la devise du portefeuille
  };

  // set de la devise
  portfolioDash.currencyAbbr = (
    await portfolioInfos(portfolioDash.id)
  ).currencyAbbr;

  // initial credit
  portfolioDash.initCredit = +(await initial(portfolioDash.id));

  // on recupère tous les trades ouverts et fermés sur le portfolio
  const allOpensTrades = await opened(portfolioDash.id);
  const allClosedTrades = await closed(portfolioDash.id);

  // on va recupérer les détails des trades triés par encours et fermés
  const { activesDetails, closedTrades } = await getDetails(
    allOpensTrades,
    allClosedTrades
  );

  // on va chercher la synthèse des trades actifs
  const balanceActives = balanceOfActivestrades(activesDetails);

  // on traite les infos pour faire le dashboard
  const dashboard = await feedDashboard(
    portfolioDash,
    balanceActives,
    closedTrades
  );

  // on renvoie le tableau
  return dashboard;
}

/**
 * Récupère le tableau de bord d'un portefeuille via la route /portfolio/dashboard/id
 * @param {Request} req - La requête HTTP contenant les paramètres.
 * @param {Response} res - La réponse HTTP à renvoyer.
 */
export const getOnePortfolioDashboard = async (req, res) => {

  try {
    // Appel à la fonction portfolioDashboard pour récupérer le tableau de bord du portefeuille spécifié par son identifiant
    const dashboard = await portfolioDashboard(+req.params.idPortfolio);

    // Réponse avec le tableau de bord en tant que JSON
    res.status(200).json(dashboard);
  } catch (error) {
    // En cas d'erreur, renvoyer un message JSON contenant l'erreur
    res.json({ msg: error });
  }
};

 


/**
 * Récupère le tableau de bord global d'un utilisateur via la route /portfolios/dashboard/id
 * @param {Request} req - La requête HTTP contenant les paramètres.
 * @param {Response} res - La réponse HTTP à renvoyer.
 */
export const getGlobalDashboardOfOneUser = async (req, res) => {

  // On récupère les différentes devises de l'application
  const currenciesArray = await appCurrencies();

  // On récupère l'abbréviation de la devise de base de l'application (appCurrency)
  const appCurrencyAbbr = global.appCurrency;

  // On récupère le symbole de la devise de base de l'application (appCurrency)
  const appCurrencySymbol = currenciesArray.find(
    (el) => el.abbr === global.appCurrency
  ).symbol;

  // On récupère les informations sur les taux de conversion
  const appForex = await appGetForex();

  try {
    // Initialisation du tableau de bord du portefeuille global
    
    const portfolioDash = {
      //userId: +req.params.userId,
      userId: +res.locals.datas.userId, // permet de les visitors
      currencyAbbr: appCurrencyAbbr,
      currencySymbol: appCurrencySymbol,
      currentPv: 0,
      currentPvPc: 0,
      potential: 0,
      potentialPc: 0,
      perfIfStopeed: 0,
      perfIfStopeedPc: 0,
      dailyVariation: 0,
      dailyVariationPc: 0,
      initCredit: 0,
      assets: 0,
      cash: 0,
      totalBalance: 0,
      totalPerf: 0,
      totalPerfPc: 0,
      activeK: 0,
    };

  
    // On récupère la liste des portefeuilles de l'utilisateur
    const portfolios = await portfoliosByUser(portfolioDash.userId);


    // Pour chaque portefeuille on va chercher le tableau de bord et alimenter le tableau de bord global
    for await (const portfolio of portfolios) {
      const dash = await portfolioDashboard(portfolio.id);

      // À partir de la devise de l'application et de celle du portefeuille, on cherche le taux de change
      const xRate = appForex.find(
        (el) =>
          el.from_currency === appCurrencyAbbr &&
          el.to_currency === dash.currencyAbbr
      ).rate;


      // Mise à jour des valeurs du tableau de bord global avec les valeurs du portefeuille en cours
      portfolioDash.currentPv = +(
        portfolioDash.currentPv +
        (1 / xRate) * dash.currentPv
      ).toFixed(2);
      portfolioDash.potential = +(
        portfolioDash.potential +
        (1 / xRate) * dash.potential
      ).toFixed(2);
      portfolioDash.perfIfStopeed = +(
        portfolioDash.perfIfStopeed +
        (1 / xRate) * dash.perfIfStopeed
      ).toFixed(2);
      portfolioDash.dailyVariation = +(
        portfolioDash.dailyVariation +
        (1 / xRate) * dash.dailyVariation
      ).toFixed(2);
      portfolioDash.initCredit = +(
        portfolioDash.initCredit +
        (1 / xRate) * dash.initCredit
      ).toFixed(2);
      portfolioDash.assets = +(
        portfolioDash.assets +
        (1 / xRate) * dash.assets
      ).toFixed(2);
      portfolioDash.cash = +(
        portfolioDash.cash +
        (1 / xRate) * dash.cash
      ).toFixed(2);
      portfolioDash.totalBalance = +(
        portfolioDash.totalBalance +
        (1 / xRate) * dash.totalBalance
      ).toFixed(2);
      portfolioDash.totalPerf = +(
        portfolioDash.totalPerf +
        (1 / xRate) * dash.totalPerf
      ).toFixed(2);
      portfolioDash.activeK = +(
        portfolioDash.activeK +
        (1 / xRate) * dash.activeK
      ).toFixed(2);
      //console.log(portfolioDash);
    }

    // Calcul de la variation journalière en pourcentage
    portfolioDash.dailyVariationPc = +(
      (portfolioDash.dailyVariation /
        (portfolioDash.currentPv - portfolioDash.dailyVariation)) *
      100
    ).toFixed(2);

    // Calcul du pourcentage de PV latent par rapport au capital engagé en pourcentage
    portfolioDash.currentPvPc = +(
      (portfolioDash.currentPv / portfolioDash.activeK) *
      100
    ).toFixed(2);

    // Calcul du pourcentage de potentiel par rapport au capital engagé en pourcentage
    portfolioDash.potentialPc = +(
      (portfolioDash.potential / portfolioDash.activeK) *
      100
    ).toFixed(2);

    // Calcul du risque potentiel en pourcentage
    portfolioDash.perfIfStopeedPc = +(
      (portfolioDash.perfIfStopeed / portfolioDash.activeK) *
      100
    ).toFixed(2);

    // Calcul de la performance totale en pourcentage
    portfolioDash.totalPerfPc = +(
      (portfolioDash.totalPerf / portfolioDash.initCredit) *
      100
    ).toFixed(2);



    // Envoi du tableau de bord global en tant que réponse JSON
    res.status(200).json(portfolioDash);
  } catch (error) {
    // En cas d'erreur, renvoyer un message JSON contenant l'erreur
    res.json({ msg: error });
  }
};

 
/**
 * On récupère les détails d'un portfolio particulier via la route /portfolios/:idPortfolio/details
 * @param {Request} req - La requête HTTP contenant les paramètres.
 * @param {Response} res - La réponse HTTP à renvoyer.
 */
export const getDetailsOfOnePorfolio = async (req, res) => {
  try {
    const portfolioId = req.params.idPortfolio;

    // On récupère tous les trades ouverts et fermés sur le portfolio
    const allOpensTrades = await opened(portfolioId);
    const allClosedTrades = await closed(portfolioId);

    // On va récupérer les détails des trades triés par en-cours et fermés
    const { activesDetails, closedTrades } = await getDetails(
      allOpensTrades,
      allClosedTrades
    );

    ///////////////////////////////////
    // Pour chaque trade actif, nous allons construire le tableau des détails

    const detailledTrades = [];

    for (const element of activesDetails) {
      const trade = {
        tradeId: element.tradeId,
        title: element.title,
        last: +(+element.lastQuote).toFixed(2),
        position: element.position,
        pru: 0,
        currentPv: 0,
        currentPvPc: 0,
        potential: 0,
        potentialPc: 0,
        perfIfStopeed: 0,
        perfIfStopeedPc: 0,
        dailyVariation: 0,
        dailyVariationPc: 0,
        target: +(+element.currentTarget).toFixed(2),
        stop: +(+element.currentStop).toFixed(2),
        initialValue: 0,
        actualValue: 0,
        nbActivesShares: 0,
      };

      // Calculs
      const nbActivesShares = +element.bougth - element.sold;
      const pru = +((+element.enterK + +element.enterTaxs) / +element.bougth);
      const activeK = pru * nbActivesShares;

      trade.pru = pru;
      trade.nbActivesShares = nbActivesShares;

      // +/- value actuelle en montant / positions actives
      trade.currentPv = +(
        element.position === "long"
          ? nbActivesShares * (element.lastQuote - pru)
          : nbActivesShares *
            ((+element.enterK - +element.enterTaxs) / +element.bougth -
              +element.lastQuote)
      ).toFixed(2);
      trade.currentPvPc = +((trade.currentPv / activeK) * 100).toFixed(2);

      // Potentiel restant en valeur / positions actives
      trade.potential = +(
        nbActivesShares *
        (element.position === "long"
          ? element.currentTarget - element.lastQuote
          : element.lastQuote - element.currentTarget)
      ).toFixed(2);
      trade.potentialPc = +((trade.potential / activeK) * 100).toFixed(2);

      // Performance si stop touché (risque ) en valeur / positions actives
      trade.perfIfStopeed = +(
        element.position === "long"
          ? nbActivesShares * (+element.currentStop - pru)
          : nbActivesShares *
              (+element.enterK / +element.bougth - +element.currentStop) -
            +element.enterTaxs
      ).toFixed(2);
      trade.perfIfStopeedPc = +((trade.perfIfStopeed / activeK) * 100).toFixed(
        2
      );

      // Variation quotidienne = valorisation jour - valorisation veille en valeur
      trade.dailyVariation = +(
        element.position === "long"
          ? (element.lastQuote - element.beforeQuote) * nbActivesShares
          : -(element.lastQuote - element.beforeQuote) * nbActivesShares
      ).toFixed(2);
      trade.dailyVariationPc = +(
        (trade.dailyVariation / activeK) *
        100
      ).toFixed(2);

      trade.initialValue = +activeK.toFixed(2);

      // Exposition :
      trade.actualValue = +(
        element.position === "long"
          ? +nbActivesShares * +element.lastQuote
          : +nbActivesShares *
            (+element.enterK / +element.bougth -
              +element.lastQuote +
              +element.enterK / +element.bougth)
      ).toFixed(2);

      detailledTrades.push(trade);
    }

    res.status(200).json(detailledTrades);
  } catch (error) {
    res.json({ msg: error });
  }
};
