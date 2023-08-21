// recupère l'id du user (recup d'aprés le token reçu et validé)
//const userId = res.locals.datas.userId ?? null ;

import { checkIfUserExistByEmail } from "./controllerFunctionsUtils.js";
 
 
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
  const cleanEmail = (email.trim()).toLowerCase();

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
  if (cleanPwd.length > 20 || cleanPwd.length < 8) {
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
  if (cleanPwd.length > 20 ) {
    inputsErrors.push("Mot de passe non valide");
  }

  // Stockage des valeurs vérifiées dans l'objet
  verifiedValues = {
    pwd: cleanPwd,
    email: cleanEmail,
  };

  return { inputsErrors, verifiedValues }; // Renvoi des erreurs et des valeurs vérifiées
}



