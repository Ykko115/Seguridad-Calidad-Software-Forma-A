const { By, until } = require("selenium-webdriver");
const {
  crearDriver,
  esperarPorTestId,
  esperarPorTexto,
  iniciarSesion,
} = require("./ayudas");

let driver;

beforeAll(async () => {
  driver = await crearDriver();
}, 90000);

afterAll(async () => {
  if (driver) await driver.quit();
}, 90000);

test("E2E-08: el editor ve el enlace de Usuarios en la navegación (el frontend no aplica el rol)", async () => {
  await iniciarSesion(driver, "editor", "editor");
  await esperarPorTexto(driver, "Bienvenido", 30000);
  const enlaceUsuarios = await driver.findElements(
    By.css('[data-testid="link-nav-usuarios"]')
  );
  expect(enlaceUsuarios.length).toBeGreaterThan(0);
  const enlaceClientes = await driver.findElements(
    By.css('[data-testid="link-nav-clientes"]')
  );
  expect(enlaceClientes.length).toBeGreaterThan(0);
});

test("E2E-09: /usuarios muestra la lista de usuarios al editor en vez del mensaje de no autorizado (hallazgo)", async () => {
  await driver.get("http://localhost:3350/usuarios");
  await esperarPorTexto(driver, "Gestión de Usuarios", 30000);
  const url = await driver.getCurrentUrl();
  expect(url).toContain("/usuarios");
  const mensajeNoAutorizado = await driver.findElements(
    By.xpath('//*[contains(., "No autorizado")]')
  );
  expect(mensajeNoAutorizado).toHaveLength(0);
});

test("E2E-10: el editor ve la pestaña Crear Cliente porque la UI no distingue roles (hallazgo)", async () => {
  await driver.get("http://localhost:3350/clientes");
  await esperarPorTexto(driver, "Gestión de Clientes", 30000);
  await esperarPorTexto(driver, "Listar Clientes");
  const pestanaCrear = await driver.findElements(
    By.xpath('//*[@role="tab" and contains(., "Crear Cliente")]')
  );
  expect(pestanaCrear.length).toBeGreaterThan(0);
});

test("E2E-11: el editor ve acciones de editar y eliminar en contratos en lugar de solo lectura (hallazgo)", async () => {
  await driver.get("http://localhost:3350/contratos");
  await esperarPorTexto(driver, "Gestión de Contratos", 30000);
  await driver.wait(
    until.elementLocated(By.css('[data-testid^="button-contrato-editar-"]')),
    30000
  );
  const botonesEditar = await driver.findElements(
    By.css('[data-testid^="button-contrato-editar-"]')
  );
  expect(botonesEditar.length).toBeGreaterThan(0);
  const soloLectura = await driver.findElements(
    By.xpath('//*[contains(., "Solo lectura")]')
  );
  expect(soloLectura).toHaveLength(0);
});
