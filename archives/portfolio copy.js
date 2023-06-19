import Query from "../model/query.js";

//**********************************************************
//* Determination de l'apport total de cash
//*
const initial = async (id) => {
  const query = `
   SELECT SUM(deposit.amount) as totalDeposit FROM deposit 
   WHERE  deposit.porfolio_id=?
    `;
  const result = await Query.doByValue(query, id);
  return result[0].totalDeposit;
};

async function opened(idPortfolio) {
  /**
   * selection de tous les trades long ouverts pour un portfolios
   * retour de l'id du trade, de la quantité buy et du côut total
   */
    const query = `
        select enter.trade_id as tradeId, SUM(enter.quantity) as quantity, 
        SUM((price*quantity)+fees+tax) as totalCost, trade.position
        FROM enter
        JOIN trade ON trade.id = enter.trade_id
        WHERE trade.portfolio_id =? and trade.position = "long"
        GROUP By enter.trade_id
    `;
    const [openedLong] =  await Query.doByValue(query, idPortfolio);
  /**
   * trades shorts
   */
    const query2 = `
        select enter.trade_id as tradeId, SUM(enter.quantity) as quantity, 
        SUM((price*quantity)+fees+tax) as totalCost, SUM(price*quantity) as refEnterPrice, trade.position
        FROM enter
        JOIN trade ON trade.id = enter.trade_id
        WHERE trade.portfolio_id =? and trade.position = "short"
        GROUP By enter.trade_id
    `;
    const [openedShort] = await Query.doByValue(query2, idPortfolio);

  const opened = [{ ...openedLong, ...openedShort }];

  console.log (opened)

  return opened
}

/**
 * selection de tous les trades long fermés pour un portfolios
 * retour de l'id du trade, de la quantité exit et du prix de vente total
 */
const closed = async (idPortfolio) => {
  const query = `
        select closure.trade_id as tradeId, SUM(closure.quantity) as quantity, 
        SUM((price*quantity)-fees-tax) as totalSold
        SUM (price*quantity) as refExitPrice
        FROM closure
        JOIN trade ON trade.id = closure.trade_id
        WHERE trade.portfolio_id =?  
        GROUP By closure.trade_id
    `;
  return await Query.doByValue(query, idPortfolio);
};

/**
 * @param {*} idTrade
 * @returns Détails du trade actifs
 */
const detailsCurrentTrade = async (idTrade) => {
  const query = `
        SELECT trade.currentTarget, trade.currentStop, 
        activeStock.lastQuote, activeStock.beforeQuote
        FROM trade
        JOIN stock ON trade.stock_id = 	stock.id
        JOIN activeStock ON stock.id = activeStock.stock_id
        WHERE trade.id = ? 
    `;
  return await Query.doByValue(query, idTrade);
};

/***********************************************************
 * retourne les trades à partir des tableaux
 * des entrées et de celui des sorties sur les long
 */
async function getDetails(opened, closed) {
  let activesTrades = [];
  let closedTrades = [];

  // on commence à construire un tableau avec tous les détails des trades
  for (const element1 of opened) {
    // pour chaque trade
    let remains = 0;
    let flag = false;
    for (const element2 of closed) {
      if (element2.tradeId === element1.tradeId) {
        flag = true;
        // on verifie si il existe une cloture
        remains = +element1.quantity - element2.quantity;
        if (remains > 0) {
          // le trade est actif
          activesTrades.push({
            tradeId: element1.tradeId,
            position: element1.position,
            bougth: element1.quantity,
            cost: element1.totalCost,
            remains: remains,
            sold: element2.quantity,
            amount: element2.totalSold,
          });
        } else {
          // le trade n'est plus actif
          closedTrades.push({
            tradeId: element1.tradeId,
            position: element1.position,
            bougth: element1.quantity,
            cost: element1.totalCost,
            remains: remains,
            sold: element2.quantity,
            amount: element2.totalSold,
          });
        }
      }
    }

    if (flag === false) {
      // pas de clorure pour ce trade
      activesTrades.push({
        tradeId: element1.tradeId,
        position: element1.position,
        bougth: element1.quantity,
        cost: element1.totalCost,
        remains: +element1.quantity,
        sold: 0,
        amount: 0,
      });
    }
  }
  // pour chaque trade ACTIF  -> infos actuelles sur target/objectif/ cours jour et précédent
  const activesDetails = [];
  for (const element of activesTrades) {
    const [details] = await detailsCurrentTrade(element.tradeId);
    activesDetails.push({ ...element, ...details });
  }
  // console.log("actifs : ", activesDetails);
  // console.log("totalement cloturés  : ", closedTrades);
  return { activesDetails, closedTrades };
}

/**
 * @param {*} activesDetails
 * @returns la synthèse des trades actis
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
    const nbActivesShares = element.bougth - element.sold;
    const pru = +(element.cost / element.bougth);

    

    // capital investi sur chaque trade
    const activeK = pru * nbActivesShares;
    balanceActives.activeK += activeK;

    // +/- value actuelle en montant / positions actives

    console.log (element.position, pru ,element.lastQuote )


    const pv =
      nbActivesShares *
      (element.position === "long"
        ? (element.lastQuote - pru) 
        : pru - +element.lastQuote);
    balanceActives.currentPv += pv;

    // potentiel restant en valeur / positions actives
    const remains =
      nbActivesShares *
      (element.position === "long"
        ? element.currentTarget - element.lastQuote
        : element.lastQuote - element.currentTarget);
    balanceActives.potential += remains;

    // performance si stop touché (risque ) en valeur / posirtions actives
    const perfIfStopped =
      nbActivesShares *
      (element.position === "long"
        ? element.currentStop - pru
        : pru - element.currentStop);
    balanceActives.perfIfStopeed += perfIfStopped;

    // daily variation = valorisation jour - valorisation veille en valeur

    console.log(element.lastQuote,element.beforeQuote);


    const delta =
      element.position === "long"
        ? (element.lastQuote - element.beforeQuote) * nbActivesShares
        : -(element.lastQuote - element.beforeQuote) * nbActivesShares;



    balanceActives.dailyVariation += delta;

    // volorisation des titres actifs
    const assets = nbActivesShares * element.lastQuote;
    balanceActives.assets += assets;

    // mouvements de cash sur le porfolio
const cash = -element.cost + +element.amount;

   



    balanceActives.cash += cash;
  }

  return balanceActives;
}

/**
 * On recupère le tableau de bord d'un portfolio particulier  /portfolio/dashboard/id
 */

export const getOnePortfolioDashboard = async (req, res) => {
  try {
    const portfolioDash = {
      id: req.params.id,
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
    };

    // initial credit
    portfolioDash.initCredit = +(await initial(portfolioDash.id));
    // on recupère tous les trades longs ouverts et fermés sur le portfolio
    const openedLong = await opened(portfolioDash.id);
    const closedLong = await closed(portfolioDash.id);

    // on va recupérer les détails des trades triés par encours et fermés
    const { activesDetails, closedTrades } = await getDetails(
      openedLong,
      closedLong
    );

    // on va chercher la synthèse des trades actifs
    const balanceActives = balanceOfActivestrades(activesDetails);

    // console.log("balanceActives:", balanceActives);

    portfolioDash.currentPv = +balanceActives.currentPv.toFixed(2);
    portfolioDash.currentPvPc = +(
      (balanceActives.currentPv / balanceActives.activeK) *
      100
    ).toFixed(2);

    portfolioDash.potential = +balanceActives.potential.toFixed(2);
    portfolioDash.potentialPc = +(
      (balanceActives.potential / balanceActives.activeK) *
      100
    ).toFixed(2);

    portfolioDash.perfIfStopeed = +balanceActives.perfIfStopeed.toFixed(2);
    portfolioDash.perfIfStopeedPc = +(
      (balanceActives.perfIfStopeed / balanceActives.activeK) *
      100
    ).toFixed(2);

    portfolioDash.dailyVariation = +balanceActives.dailyVariation.toFixed(2);
    portfolioDash.dailyVariationPc = +(
      (balanceActives.dailyVariation / balanceActives.activeK) *
      100
    ).toFixed(2);

    portfolioDash.assets = balanceActives.assets;

    // pour la suite on intègre les  positions clôturées qui vont influer sur la cash du portfolio
    let closedTradesCash = 0;
    for (const element of closedTrades) {
      closedTradesCash += +element.amount - +element.cost;
    }

    portfolioDash.cash = +(
      portfolioDash.initCredit +
      closedTradesCash +
      balanceActives.cash
    ).toFixed(2);

    portfolioDash.totalBalance = +(
      portfolioDash.assets + portfolioDash.cash
    ).toFixed(2);

    portfolioDash.totalPerf = +(
      portfolioDash.totalBalance - portfolioDash.initCredit
    ).toFixed(2);

    portfolioDash.totalPerfPc = +(
      ((portfolioDash.totalBalance - portfolioDash.initCredit) /
        portfolioDash.initCredit) *
      100
    ).toFixed(2);

    res.status(200).json(portfolioDash);
  } catch (error) {
    res.json({ msg: error });
  }
};
