const express = require("express");
const fs = require("fs");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const RG_FILE = "./data/rgs.json";
const MULTAS_FILE = "./data/multas.json";
const VEICULOS_FILE = "./data/veiculos.json";

function carregarJSON(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "{}");
  const data = fs.readFileSync(file);
  if (data.length === 0) return {};
  return JSON.parse(data);
}

function salvarJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Buscar RG
app.get("/rg/:id", (req, res) => {
  const rgs = carregarJSON(RG_FILE);
  const rg = rgs[req.params.id];
  if (!rg) return res.status(404).json({ error: "RG não encontrado" });
  res.json(rg);
});

// Registrar multa
app.post("/multas", (req, res) => {
  const { idUser, valor, descricao } = req.body;
  if (!idUser || !valor || !descricao) return res.status(400).json({ error: "Dados incompletos" });
  
  const rgs = carregarJSON(RG_FILE);
  if (!rgs[idUser]) return res.status(404).json({ error: "RG não encontrado" });

  if (!rgs[idUser].antecedentes) rgs[idUser].antecedentes = [];
  rgs[idUser].antecedentes.push({ data: new Date().toLocaleDateString(), descricao, valor });

  salvarJSON(RG_FILE, rgs);

  const multas = carregarJSON(MULTAS_FILE);
  if (!multas[idUser]) multas[idUser] = [];
  multas[idUser].push({ data: new Date().toLocaleString(), descricao, valor });
  salvarJSON(MULTAS_FILE, multas);

  res.json({ sucesso: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚔 Sistema Policial rodando na porta ${PORT}`));
