const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs-extra");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

const RG_FILE = path.join(__dirname, "data/rgs.json");
const MULTAS_FILE = path.join(__dirname, "data/multas.json");
const VEICULOS_FILE = path.join(__dirname, "data/veiculos.json");

// Carregar JSONs
function carregarJSON(file) {
  if (!fs.existsSync(file)) fs.writeJsonSync(file, {});
  return fs.readJsonSync(file);
}

// Salvar JSONs
function salvarJSON(file, data) {
  fs.writeJsonSync(file, data, { spaces: 2 });
}

// ================= ROTAS ===================

// Página inicial
app.get("/", (req, res) => {
  res.render("index");
});

// Consultar RG
app.get("/rg/:id", (req, res) => {
  const rgs = carregarJSON(RG_FILE);
  const rg = rgs[req.params.id];
  if (!rg) return res.send("❌ RG não encontrado.");
  res.render("rg", { rg });
});

// Registrar multa
app.get("/multas", (req, res) => {
  const multas = carregarJSON(MULTAS_FILE);
  res.render("multas", { multas });
});

app.post("/multas", (req, res) => {
  const { rg, descricao, valor } = req.body;
  const multas = carregarJSON(MULTAS_FILE);
  if (!multas[rg]) multas[rg] = [];
  multas[rg].push({ descricao, valor, data: new Date().toLocaleString() });
  salvarJSON(MULTAS_FILE, multas);
  res.redirect("/multas");
});

// Busca de veículos
app.get("/veiculos", (req, res) => {
  const veiculos = carregarJSON(VEICULOS_FILE);
  res.render("veiculos", { veiculos });
});

app.listen(PORT, () => {
  console.log(`🚔 Polícia Site online na porta ${PORT}`);
});
