const { By, until } = require("selenium-webdriver");
const {
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
  limpiarResiduosE2E,
} = require("./ayudas");

const marca = Date.now();
const NOMBRE_CLIENTE = `E2E-Cliente-${marca}`;
const CORREO_CLIENTE = `e2e.cliente.${marca}@atlasfake.com`;
const TITULO_CONTRATO = `E2E-Contrato-${marca}`;

let driver;

beforeAll(async () => {
  await limpiarResiduosE2E();
  driver = await crearDriver();
}, 90000);

afterAll(async () => {
  if (driver) await driver.quit();
  await limpiarResiduosE2E();
}, 90000);

test("E2E-01: login de administrador con credenciales válidas redirige al Home", async () => {
  await iniciarSesion(driver, "admin", "admin");
  const url = await driver.getCurrentUrl();
  expect(url).toContain("/home");
  await esperarPorTexto(driver, "Bienvenido", 30000);
});

test("E2E-02: el Home muestra las tarjetas de métricas del sistema", async () => {
  await esperarPorTexto(driver, "Usuarios de la Empresa", 30000);
  await esperarPorTexto(driver, "Clientes Creados");
  await esperarPorTexto(driver, "Vencen en 15 días");
  await esperarPorTexto(driver, "Vencen en 30 días");
  await esperarPorTexto(driver, "Vencidos");
});

test("E2E-03: la navegación lleva al listado de clientes", async () => {
  await hacerClic(driver, "link-nav-clientes");
  await esperarPorTexto(driver, "Gestión de Clientes", 30000);
  await esperarPorTexto(driver, "Listar Clientes");
});

test("E2E-04: crear un cliente desde la pestaña Crear lo muestra en el listado", async () => {
  await hacerClicPorTexto(
    driver,
    '//*[@role="tab" and contains(., "Crear Cliente")]'
  );
  await esperarPorTestId(driver, "input-cliente-tab-nombre");
  await escribir(driver, "input-cliente-tab-rut", "12.345.678-9");
  await escribir(driver, "input-cliente-tab-nombre", NOMBRE_CLIENTE);
  await escribir(driver, "input-cliente-tab-correo", CORREO_CLIENTE);
  await hacerClic(driver, "button-cliente-tab-guardar");
  await driver.wait(
    until.elementLocated(
      By.xpath(`//tr[.//td[contains(., "${NOMBRE_CLIENTE}")]]`)
    ),
    30000
  );
});

test("E2E-05: crear un contrato desde la pestaña Crear lo muestra en el listado", async () => {
  await hacerClic(driver, "link-nav-contratos");
  await esperarPorTexto(driver, "Gestión de Contratos", 30000);
  await hacerClicPorTexto(
    driver,
    '//*[@role="tab" and contains(., "Crear Contrato")]'
  );
  await esperarPorTestId(driver, "input-contrato-tab-titulo");
  await seleccionarOpcion(driver, "select-contrato-tab-cliente", NOMBRE_CLIENTE);
  await escribir(driver, "input-contrato-tab-titulo", TITULO_CONTRATO);
  await escribirFecha(driver, "input-contrato-tab-fecha-inicio", "2026-11-11");
  await escribirFecha(driver, "input-contrato-tab-fecha-fin", "2026-12-31");
  await escribir(
    driver,
    "input-contrato-tab-descripcion",
    "Contrato creado por la suite E2E"
  );
  await hacerClic(driver, "button-contrato-tab-guardar");
  await driver.wait(
    until.elementLocated(
      By.xpath(`//tr[.//td[contains(., "${TITULO_CONTRATO}")]]`)
    ),
    30000
  );
});

test("E2E-06: la auditoría registra la creación del cliente", async () => {
  await hacerClic(driver, "link-nav-auditoría");
  await esperarPorTexto(driver, "Historial completo", 30000);
  await driver.wait(
    until.elementLocated(By.xpath(`//*[contains(., "${NOMBRE_CLIENTE}")]`)),
    30000
  );
});

test("E2E-07: cerrar sesión devuelve al login y bloquea el acceso", async () => {
  await hacerClic(driver, "button-layout-logout");
  await driver.wait(until.urlContains("/login"), 20000);
  await driver.get(`${URL_BASE}/home`);
  await driver.wait(until.urlContains("/login"), 20000);
  const url = await driver.getCurrentUrl();
  expect(url).toContain("/login");
});
