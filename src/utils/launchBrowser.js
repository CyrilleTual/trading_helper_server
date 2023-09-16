import puppeteer from "puppeteer";

export async function launchBrowser() {
  let params;
  if (process.env.RUN_IN_DOCKER === "DOCKER") {
    params = {
      headless: "new", // lance un navigateur sans UI
      executablePath: "/usr/bin/chromium-browser", ///// pour version docker à enlever pour version locale
      args: ["--no-sandbox", "--disable-setuid-sandbox"], ///// attention pour railway mais faille de sécurité
    };
  } else {
    params = {
      headless: "new", // lance un navigateur sans UI
      args: ["--no-sandbox", "--disable-setuid-sandbox"], ///// attention pour railway mais faille de sécurité
    };
  }
  // Lancement d'une instance de navigateur en mode "headless"
  return puppeteer.launch(params);
}
