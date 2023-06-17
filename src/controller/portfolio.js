import Query from "../model/query.js";

//**********************************************************
//* Determination de l'apport total de cash 
//*
const initial = async (id)=>{
  const query = `
   SELECT SUM(deposit.amount) as totalDeposit FROM deposit 
   WHERE  deposit.porfolio_id=?
    `;
  const result = (await Query.doByValue(query, id));
  return (result[0].totalDeposit);
}

/**
 * selection de tous les trades long ouverts pour un portfolios
 * retour de l'id du trade, de la quantité buy et du côut total
 */
const openedLg = async (idPortfolio) => {
  const query = `
select enter.trade_id as tradeId, SUM(enter.quantity) as quantity, 
SUM((price*quantity)+fees+tax) as totalCost
FROM enter
JOIN trade ON trade.id = enter.trade_id
WHERE trade.portfolio_id =? AND trade.position = 'long'
GROUP By enter.trade_id
    `;
  return await Query.doByValue(query, idPortfolio);
};


/**
 * selection de tous les trades long fermés pour un portfolios
 * retour de l'id du trade, de la quantité exit et du prix de vente total
 */
const closedLg = async (idPortfolio) => {
  const query = `
select closure.trade_id as tradeId, SUM(closure.quantity) as quantity, 
SUM((price*quantity)-fees-tax) as totalSold
FROM closure
JOIN trade ON trade.id = closure.trade_id
WHERE trade.portfolio_id =? AND trade.position = 'long'
GROUP By closure.trade_id
    `;
  return await Query.doByValue(query, idPortfolio);
};

/***********************************************************
 * retourne les trades à partir des tableaux
 * des entrées et de celui des sorties sur les long
 */
function processLong(opened, closed) {
 
  let trades = [];

  // on commence à construire un tableau avec tous les détails des trades 
  for (const element1 of opened) {
    let remains;
    for (const element2 of closed) {
      if (element2.tradeId === element1.tradeId) {
        remains = (element1.quantity) -  (element2.quantity);
      }else {
        remains = element1.quantity;
        element2.quantity = 0;
        element2.totalSold = 0;
      }
      trades.push({ tradeId: element1.tradeId, bougth:element1.quantity, cost: element1.totalCost, remains: remains, sold:element2.quantity, amount: element2.totalSold});
    } 
  }
  console.log (": ", trades);

  // pour chaque trade -> infos actuelles sur target/objectif/ cours jour et précédent


}









/**
 * On recupère le tableau de bord d'un portfolio particulier  /portfolio/dashboard/id
 */

export const getOnePortfolioDashboard = async (req, res) => {
  try {

    const portfolioDash = {
      id:req.params.id,
      current: 0,
      potential: 0,
      perfIfStopeed: 0,
      dailyVariation: 0,
      initCredit: 0,
      assets: 0,
      cash: 0,
      totalBalance: 0,
      totalPerf: 0,
    };

    // initial credit
    portfolioDash.initCredit = await initial(portfolioDash.id)

    // on recupère tous les trades longs ouverts et fermés sur le portfolio
    const openedLong = await openedLg(portfolioDash.id);
    const closedLong = await closedLg(portfolioDash.id);

    // on va traiter les trades longs 

    //console.log (openedLong,closedLong)

    processLong(openedLong, closedLong);





    res.status(200).json(portfolioDash);
  } catch (error) {
    res.json({ msg: error });
  }
};
