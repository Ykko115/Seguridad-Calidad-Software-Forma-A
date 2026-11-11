const { until } = require("selenium-webdriver");
const {
  URL_BASE,
  crearDriver,
  esperarPorTestId,
  esperarPorTexto,
  hacerClic,
  escribir,
  iniciarSesion,
} = require("./ayudas");

let driver;

beforeAll(async () => {
  driver = await crearDriver();
}, 90000);

afterAll(async () => {
  if (driver) await driver.quit();
}, 90000);

test("E2E-12: login con credenciales inválidas muestra el error y no navega", async () => {
  await driver.get(`${URL_BASE}/login`);
  await escribir(driver, "input-nombre-usuario", "admin");
  await escribir(driver, "input-password", "clave-incorrecta");
  await hacerClic(driver, "button-login");
  await esperarPorTexto(driver, "Credenciales inválidas", 30000);
  const url = await driver.getCurrentUrl();
  expect(url).toContain("/login");
});

test("E2E-13: la sesión se mantiene al recargar la página", async () => {
  await iniciarSesion(driver, "admin", "admin");
  await driver.navigate().refresh();
  await driver.wait(until.urlContains("/home"), 20000);
  await esperarPorTestId(driver, "link-nav-clientes", 30000);
});

test("E2E-14: tras cerrar sesión la ruta protegida redirige al login", async () => {
  await hacerClic(driver, "button-layout-logout");
  await driver.wait(until.urlContains("/login"), 20000);
  await driver.get(`${URL_BASE}/clientes`);
  await driver.wait(until.urlContains("/login"), 20000);
  const url = await driver.getCurrentUrl();
  expect(url).toContain("/login");
});

test("E2E-15: el enlace de registro lleva al formulario y volver regresa al login", async () => {
  await driver.get(`${URL_BASE}/login`);
  await hacerClic(driver, "link-registro");
  await driver.wait(until.urlContains("/registro"), 20000);
  await esperarPorTestId(driver, "button-registro-continuar", 30000);
  await hacerClic(driver, "link-login");
  await driver.wait(until.urlContains("/login"), 20000);
  await esperarPorTestId(driver, "button-login", 30000);
});
