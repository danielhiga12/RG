// 1️⃣ Imports
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");

// 2️⃣ Criação do client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 3️⃣ Variáveis do bot
const PREFIX = "!";
const RG_FILE = "./rgs.json";
const CARGOS_AUTORIZADOS = ["STAFF", "ADMIN", "MOD"];

// 4️⃣ Funções utilitárias
function gerarNumero19() { ... }
function gerarCPF() { ... }
function carregarRGs() { ... }
function salvarRGs(data) { ... }
function calcularIdade(dataNascimento) { ... }

// 5️⃣ Eventos do bot
client.on("messageCreate", async (message) => {
  // toda a lógica de !setrg, !rg, !rgdeletar
});

// 6️⃣ LOGIN (SÓ NO FINAL)
client.login(process.env.TOKEN);
