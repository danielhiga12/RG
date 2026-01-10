const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

// ===== CONFIG =====
const PREFIX = "!";
const DATA_DIR = "./data";
const RG_FILE = path.join(DATA_DIR, "rgs.json");

// ===== CARGOS =====
const CARGOS_CONSULTA = [
  "Fundador",
  "Gerente de Comunidade",
  "Monitor",
  "Administrador",
  "Moderador",
  "Policial"
];

const CARGOS_ADMIN_RG = [
  "Fundador",
  "Gerente de Comunidade",
  "Monitor",
  "Administrador",
  "Moderador"
];

// ===== SETUP =====
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(RG_FILE)) fs.writeFileSync(RG_FILE, "{}");

// ===== FUNÇÕES =====
const loadRG = () => JSON.parse(fs.readFileSync(RG_FILE));
const saveRG = (data) => fs.writeFileSync(RG_FILE, JSON.stringify(data, null, 2));

const temCargo = (member, cargos) =>
  member.roles.cache.some(r => cargos.includes(r.name));

const gerarNumero = (n) =>
  Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");

const gerarCPF = () =>
  `${gerarNumero(1)}.${gerarNumero(3)}.${gerarNumero(3)}.${gerarNumero(3)}.${gerarNumero(2)}`;

const dataBR = (ts) => new Date(ts).toLocaleDateString("pt-BR");

// ===== READY =====
client.once("ready", () => {
  console.log(`✅ Bot RG online como ${client.user.tag}`);
});

// ===== COMANDOS =====
client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  const rgs = loadRG();

  // ===== SETRG =====
  if (cmd === "setrg") {
    if (args.length < 5)
      return message.reply("❌ Use: !setrg Nome Sobrenome EstadoCivil DD/MM/AAAA Gênero");

    const nome = `${args[0]} ${args[1]}`;
    const estadoCivil = args[2];
    const nascimento = args[3];
    const genero = args[4];

    const ano = nascimento.split("/")[2];
    const idade = new Date().getFullYear() - ano;

    rgs[message.author.id] = {
      nome,
      estadoCivil,
      nascimento,
      idade,
      genero,
      rg: gerarNumero(19),
      cpf: gerarCPF(),
      emissao: Date.now(),
      vencimento: Date.now() + 30 * 24 * 60 * 60 * 1000
    };

    saveRG(rgs);
    message.reply("🪪 RG criado com sucesso!");
  }

  // ===== VER PRÓPRIO RG =====
  if (cmd === "rg") {
    const rg = rgs[message.author.id];
    if (!rg) return message.reply("❌ Você não possui RG.");

    const vencido = Date.now() > rg.vencimento;

    const embed = new EmbedBuilder()
      .setTitle("🪪 Registro Geral")
      .setColor(vencido ? "Red" : "Blue")
      .setDescription(
        `👤 **Nome:** ${rg.nome}
🆔 **RG:** ${rg.rg}
🎂 **Idade:** ${rg.idade}
📄 **CPF:** ${rg.cpf}
⚧ **Gênero:** ${rg.genero}
📅 **Emissão:** ${dataBR(rg.emissao)}
⏰ **Validade:** ${dataBR(rg.vencimento)}
📌 **Status:** ${vencido ? "❌ VENCIDO" : "✅ VÁLIDO"}`
      );

    message.channel.send({ embeds: [embed] });
  }

  // ===== CONSULTAR =====
  if (cmd === "consultar") {
    if (!temCargo(message.member, CARGOS_CONSULTA))
      return message.reply("❌ Sem permissão.");

    let rg;

    if (message.mentions.users.first()) {
      rg = rgs[message.mentions.users.first().id];
    } else {
      const termo = args[0];
      rg = Object.values(rgs).find(r => r.rg === termo || r.cpf === termo);
    }

    if (!rg) return message.reply("❌ RG não encontrado.");

    const embed = new EmbedBuilder()
      .setTitle("🔎 Consulta de RG")
      .setColor("Orange")
      .setDescription(
        `👤 **Nome:** ${rg.nome}
🆔 **RG:** ${rg.rg}
📄 **CPF:** ${rg.cpf}
🎂 **Idade:** ${rg.idade}
⏰ **Validade:** ${dataBR(rg.vencimento)}`
      );

    message.channel.send({ embeds: [embed] });
  }

  // ===== EDITAR RG =====
  if (cmd === "editarrg") {
    if (!temCargo(message.member, CARGOS_ADMIN_RG))
      return message.reply("❌ Sem permissão.");

    const user = message.mentions.users.first();
    if (!user || !rgs[user.id])
      return message.reply("❌ Usuário sem RG.");

    const campo = args[1];
    const novoValor = args.slice(2).join(" ");
    if (!campo || !novoValor)
      return message.reply("❌ Use: !editarrg @user campo valor");

    rgs[user.id][campo] = novoValor;
    saveRG(rgs);

    message.reply("✅ RG editado com sucesso!");
  }

  // ===== DELETAR RG =====
  if (cmd === "deletarrg") {
    if (!temCargo(message.member, CARGOS_ADMIN_RG))
      return message.reply("❌ Sem permissão.");

    const user = message.mentions.users.first();
    if (!user || !rgs[user.id])
      return message.reply("❌ Usuário sem RG.");

    delete rgs[user.id];
    saveRG(rgs);

    message.reply("🗑 RG deletado com sucesso!");
  }

  // ===== RENOVAR RG =====
  if (cmd === "renovarrg") {
    const rg = rgs[message.author.id];
    if (!rg) return message.reply("❌ Você não possui RG.");

    if (Date.now() < rg.vencimento)
      return message.reply("❌ Seu RG ainda está válido.");

    rg.emissao = Date.now();
    rg.vencimento = Date.now() + 30 * 24 * 60 * 60 * 1000;

    saveRG(rgs);
    message.reply("✅ RG renovado com sucesso!");
  }
});

// ===== LOGIN =====
client.login(process.env.TOKEN);
