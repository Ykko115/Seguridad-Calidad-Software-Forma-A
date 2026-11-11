const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const URL_BASE = process.env.E2E_URL || "http://localhost:3350";
const API = process.env.E2E_API_URL || "http://localhost:4450";

async function crearDriver() {
  const opciones = new chrome.Options();
  if (process.env.E2E_HEADED !== "1") {
    opciones.addArguments("--headless=new");
  }
  opciones.addArguments(
    "--window-size=1400,900",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage"
  );
  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(opciones)
    .build();
  await driver.manage().setTimeouts({
    implicit: 0,
    pageLoad: 30000,
    script: 30000,
  });
  return driver;
}

async function esperarPorTestId(driver, testId, tiempo = 20000) {
  const localizador = By.css(`[data-testid="${testId}"]`);
  const elemento = await driver.wait(until.elementLocated(localizador), tiempo);
  return driver.wait(until.elementIsVisible(elemento), tiempo);
}

async function esperarPorTexto(driver, texto, tiempo = 20000) {
  return driver.wait(
    until.elementLocated(By.xpath(`//*[contains(., "${texto}")]`)),
    tiempo
  );
}

async function hacerClic(driver, testId, tiempo = 20000) {
  const elemento = await esperarPorTestId(driver, testId, tiempo);
  await driver.executeScript(
    "arguments[0].scrollIntoView({ block: 'center' })",
    elemento
  );
  await driver.wait(until.elementIsEnabled(elemento), tiempo);
  await elemento.click();
}

async function hacerClicPorTexto(driver, xpath, tiempo = 20000) {
  const elemento = await driver.wait(
    until.elementLocated(By.xpath(xpath)),
    tiempo
  );
  await driver.wait(until.elementIsVisible(elemento), tiempo);
  await driver.executeScript(
    "arguments[0].scrollIntoView({ block: 'center' })",
    elemento
  );
  await elemento.click();
}

async function escribir(driver, testId, texto, tiempo = 20000) {
  const campo = await esperarPorTestId(driver, testId, tiempo);
  await campo.clear();
  await campo.sendKeys(texto);
}

async function escribirFecha(driver, testId, fecha, tiempo = 20000) {
  const campo = await esperarPorTestId(driver, testId, tiempo);
  await driver.executeScript(
    "const campo = arguments[0];" +
      "const valor = arguments[1];" +
      "const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;" +
      "setter.call(campo, valor);" +
      "campo.dispatchEvent(new Event('input', { bubbles: true }));" +
      "campo.dispatchEvent(new Event('change', { bubbles: true }));",
    campo,
    fecha
  );
}

async function seleccionarOpcion(driver, testIdSelect, textoOpcion, tiempo = 20000) {
  await hacerClic(driver, testIdSelect, tiempo);
  const opcion = await driver.wait(
    until.elementLocated(By.xpath(`//li[contains(., "${textoOpcion}")]`)),
    tiempo
  );
  await driver.wait(until.elementIsVisible(opcion), tiempo);
  await opcion.click();
}

async function iniciarSesion(driver, usuario, password) {
  await driver.get(`${URL_BASE}/login`);
  await escribir(driver, "input-nombre-usuario", usuario);
  await escribir(driver, "input-password", password);
  await hacerClic(driver, "button-login");
  await driver.wait(until.urlContains("/home"), 30000);
}

async function pedir(method, ruta, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(API + ruta, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let datos = null;
  try {
    datos = await res.json();
  } catch {
    datos = null;
  }
  return { status: res.status, datos };
}

async function obtenerToken(usuario = "admin", password = "admin") {
  const { status, datos } = await pedir("POST", "/autenticacion/login", {
    body: { nombre_usuario: usuario, password },
  });
  if (status !== 200 || !datos || !datos.token) {
    throw new Error(
      `Login de "${usuario}" falló (HTTP ${status}): ${JSON.stringify(datos)}`
    );
  }
  return datos.token;
}

async function limpiarResiduosE2E() {
  const token = await obtenerToken();
  const contratos = await pedir("GET", "/contratos", { token });
  if (Array.isArray(contratos.datos)) {
    for (const contrato of contratos.datos) {
      if (contrato.titulo && contrato.titulo.startsWith("E2E-")) {
        await pedir("DELETE", `/contratos/${contrato.id}`, { token });
      }
    }
  }
  const clientes = await pedir("GET", "/clientes", { token });
  if (Array.isArray(clientes.datos)) {
    for (const cliente of clientes.datos) {
      if (cliente.nombre && cliente.nombre.startsWith("E2E-")) {
        await pedir("DELETE", `/clientes/${cliente.id}`, { token });
      }
    }
  }
}

module.exports = {
  URL_BASE,
  crearDriver,
  esperarPorTestId,
  esperarPorTexto,
  hacerClic,
  hacerClicPorTexto,
  escribir,
  escribirFecha,
  seleccionarOpcion,
  iniciarSesion,
  pedir,
  obtenerToken,
  limpiarResiduosE2E,
};
