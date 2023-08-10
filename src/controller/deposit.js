import Query from "../model/query.js";

export async function feedPortfolio(idPort, amount) {
  const query2 = `INSERT INTO deposit(porfolio_id, amount) VALUES (?,?)`;
  await Query.doByValues(query2, {
    idPort,
    amount,
  });
}

