const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = "!";
const RG_FILE = "./rgs.json";
const LOG_CHANNEL_NAME = "logs-rg";

const PERM_EDITAR = ["Fundador", "Gerente de Comunidade", "Monitor", "Administrador"];
const PERM_DELETAR = ["Fundador", "Gerente de Comunidade", "Monitor"];
const PERM_CONSULTAR = [...PERM_EDITAR, "Moderador"];

/* ================= UTIL ================= */

function loadRGs() {
  if (!fs.existsSync(RG_FILE)) fs.writeFileSync(RG_FILE, "{}");
  return JSON.parse(fs.readFileSync(RG_FILE));
}

function saveRGs(data) {
  fs.writeFileSync(RG_FILE, JSON.stringify(data, null, 2));
}

function gerarNumero19() {
  let n = "";
  for (let i = 0; i < 19; i++) n += Math.floor(Math.random() * 10);
  return n;
}

function calcularIdade(data) {
  const [d, m, a] = data.split("/").map(Number);
  const hoje = new Date();
  let idade = hoje.getFullYear() - a;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) idade--;
  return idade;
}

function temCargo(member, cargos) {
  return member.roles.cache.some(r => cargos.includes(r.name));
}

async function log(guild, msg) {
  const canal = guild.channels.cache.find(c => c.name === LOG_CHANNEL_NAME);
  if (canal) canal.send(msg);
}

/* ================= BOT ================= */

client.once("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).split(";");
  const cmd = args.shift().toLowerCase();
  const rgs = loadRGs();

  /* ===== SET RG ===== */
  if (cmd === "setrg") {
    if (rgs[message.author.id])
      return message.reply("❌ Você já possui RG.");

    if (args.length < 4)
      return message.reply("Uso: `!setrg Nome Completo;Estado Civil;DD/MM/AAAA;Gênero`");

    const idade = calcularIdade(args[2]);
    if (idade < 0 || idade > 120) return message.reply("❌ Data inválida.");

    rgs[message.author.id] = {
      rg: gerarNumero19(),
      nome: args[0],
      estadoCivil: args[1],
      nascimento: args[2],
      genero: args[3],
      idade,
      criadoEm: Date.now(),
      validade: Date.now() + 1000 * 60 * 60 * 24 * 365 // 1 ano
    };

    saveRGs(rgs);
    message.reply("✅ RG criado com sucesso!");
    log(message.guild, `🆕 RG criado por ${message.author.tag}`);
  }

  /* ===== VER RG ===== */
  if (cmd === "rg") {
    const rg = rgs[message.author.id];
    if (!rg) return message.reply("❌ Você não possui RG.");

    const embed = new EmbedBuilder()
      .setTitle("🪪 Carteira de Identidade")
      .setColor("#1f2c34")
      .addFields(
        { name: "Nome", value: rg.nome },
        { name: "RG", value: rg.rg },
        { name: "Idade", value: `${rg.idade} anos` },
        { name: "Validade", value: new Date(rg.validade).toLocaleDateString() }
      );

    message.reply({ embeds: [embed] });
  }

  /* ===== CONSULTAR ===== */
  if (cmd === "consultar") {
    if (!temCargo(message.member, PERM_CONSULTAR))
      return message.reply("❌ Sem permissão.");

    const user = message.mentions.users.first();
    if (!user || !rgs[user.id]) return message.reply("❌ RG não encontrado.");

    const rg = rgs[user.id];

    const embed = new EmbedBuilder()
      .setTitle("🔍 Consulta de RG")
      .addFields(
        { name: "Nome", value: rg.nome },
        { name: "RG", value: rg.rg },
        { name: "Idade", value: `${rg.idade}` },
        { name: "Gênero", value: rg.genero }
      );

    message.reply({ embeds: [embed] });
    log(message.guild, `🔍 ${message.author.tag} consultou RG de ${user.tag}`);
  }

  /* ===== EDITAR ===== */
  if (cmd === "rgeditar") {
    if (!temCargo(message.member, PERM_EDITAR))
      return message.reply("❌ Sem permissão.");

    const user = message.mentions.users.first();
    const novoNome = args[1];
    if (!user || !novoNome || !rgs[user.id])
      return message.reply("Uso: `!rgeditar @user;Novo Nome`");

    rgs[user.id].nome = novoNome;
    saveRGs(rgs);

    message.reply("✏️ Nome do RG atualizado.");
    log(message.guild, `✏️ RG de ${user.tag} editado`);
  }

  /* ===== DELETAR ===== */
  if (cmd === "rgdeletar") {
    if (!temCargo(message.member, PERM_DELETAR))
      return message.reply("❌ Sem permissão.");

    const user = message.mentions.users.first();
    if (!user || !rgs[user.id])
      return message.reply("❌ RG não encontrado.");

    delete rgs[user.id];
    saveRGs(rgs);

    message.reply("🗑️ RG deletado.");
    log(message.guild, `🗑️ RG de ${user.tag} deletado`);
  }
});

client.login(process.env.TOKEN);

