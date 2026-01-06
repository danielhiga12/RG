const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");
const fs = require("fs");

// ================= CONFIG =================
const PREFIX = "!";
const RG_FILE = "./rgs.json";
const LOG_CHANNEL = "logs-rg";

const CARGOS_EDITAR = ["Fundador", "Gerente de Comunidade", "Monitor", "Administrador"];
const CARGOS_CONSULTAR = ["Fundador", "Gerente de Comunidade", "Monitor", "Administrador", "Moderador"];

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ================= UTIL =================
function carregarRGs() {
  if (!fs.existsSync(RG_FILE)) fs.writeFileSync(RG_FILE, "{}");
  try {
    return JSON.parse(fs.readFileSync(RG_FILE, "utf8"));
  } catch {
    return {};
  }
}

function salvarRGs(data) {
  fs.writeFileSync(RG_FILE, JSON.stringify(data, null, 2));
}

function gerarNumero19() {
  let n = "";
  for (let i = 0; i < 19; i++) n += Math.floor(Math.random() * 10);
  return n;
}

function gerarCPF() {
  const n = gerarNumero19();
  return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6,9)}.${n.slice(9)}`;
}

function calcularIdade(data) {
  const [d,m,a] = data.split("/").map(Number);
  const hoje = new Date();
  let idade = hoje.getFullYear() - a;
  if (hoje.getMonth()+1 < m || (hoje.getMonth()+1 === m && hoje.getDate() < d)) idade--;
  return idade;
}

function log(guild, msg) {
  const canal = guild.channels.cache.find(c => c.name === LOG_CHANNEL);
  if (canal) canal.send(msg);
}

// ================= RG DATA =================
let rgs = carregarRGs();

// ================= MESSAGES =================
client.on("messageCreate", async message => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(1).trim().split(" ");
  const cmd = args.shift().toLowerCase();

  // -------- !setrg --------
  if (cmd === "setrg") {
    if (rgs[message.author.id]) return message.reply("❌ Você já possui RG.");

    if (args.length < 4)
      return message.reply("Uso correto:\n`!setrg Nome Completo EstadoCivil DD/MM/AAAA Gênero`");

    const nome = args.slice(0, -3).join(" ");
    const estadoCivil = args.at(-3);
    const nascimento = args.at(-2);
    const genero = args.at(-1);

    const idade = calcularIdade(nascimento);
    if (idade < 0 || idade > 120) return message.reply("❌ Data inválida.");

    rgs[message.author.id] = {
      rg: gerarNumero19(),
      cpf: gerarCPF(),
      nome,
      estadoCivil,
      nascimento,
      genero,
      idade,
      validade: "5 anos"
    };

    salvarRGs(rgs);
    message.reply("✅ RG criado com sucesso!");
    log(message.guild, `🪪 RG criado: ${message.author.tag}`);
  }

  // -------- !rg --------
  if (cmd === "rg") {
    const rg = rgs[message.author.id];
    if (!rg) return message.reply("❌ Você não possui RG.");

    const embed = new EmbedBuilder()
      .setColor("#1f2c34")
      .setTitle("🪪 Carteira de Identidade")
      .setDescription(`━━━━━━━━━━━━━━\nRG Nº: **${rg.rg}**\n━━━━━━━━━━━━━━`)
      .addFields(
        { name: "Nome", value: rg.nome, inline: true },
        { name: "CPF", value: rg.cpf, inline: true },
        { name: "Estado Civil", value: rg.estadoCivil, inline: true },
        { name: "Nascimento", value: rg.nascimento, inline: true },
        { name: "Gênero", value: rg.genero, inline: true },
        { name: "Idade", value: `${rg.idade} anos`, inline: true }
      )
      .setFooter({ text: "Documento válido apenas para roleplay" });

    message.reply({ embeds: [embed] });
  }

  // -------- !consultar --------
  if (cmd === "consultar") {
    if (!message.member.roles.cache.some(r => CARGOS_CONSULTAR.includes(r.name)))
      return message.reply("❌ Sem permissão.");

    const user = message.mentions.users.first();
    if (!user || !rgs[user.id]) return message.reply("❌ RG não encontrado.");

    const rg = rgs[user.id];

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle(`Consulta RG - ${user.tag}`)
      .setDescription(`RG Nº: **${rg.rg}**`)
      .addFields(
        { name: "Nome", value: rg.nome },
        { name: "CPF", value: rg.cpf },
        { name: "Nascimento", value: rg.nascimento }
      );

    message.reply({ embeds: [embed] });
  }

  // -------- !rgeditar --------
  if (cmd === "rgeditar") {
    if (!message.member.roles.cache.some(r => CARGOS_EDITAR.includes(r.name)))
      return message.reply("❌ Sem permissão.");

    const user = message.mentions.users.first();
    const novoNome = args.slice(1).join(" ");

    if (!user || !novoNome || !rgs[user.id])
      return message.reply("❌ Uso: !rgeditar @user Novo Nome");

    rgs[user.id].nome = novoNome;
    salvarRGs(rgs);
    message.reply("✅ Nome do RG atualizado.");
    log(message.guild, `✏️ RG editado: ${user.tag}`);
  }

  // -------- !rgdeletar --------
  if (cmd === "rgdeletar") {
    if (!message.member.roles.cache.some(r => CARGOS_EDITAR.includes(r.name)))
      return message.reply("❌ Sem permissão.");

    const user = message.mentions.users.first();
    if (!user || !rgs[user.id]) return message.reply("❌ RG não encontrado.");

    delete rgs[user.id];
    salvarRGs(rgs);
    message.reply("🗑️ RG deletado.");
    log(message.guild, `🗑️ RG deletado: ${user.tag}`);
  }
});

// ================= /AJUDA =================
const ajudaCommand = new SlashCommandBuilder()
  .setName("ajuda")
  .setDescription("Mostra todos os comandos do servidor RP");

client.once("ready", async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
  const CLIENT_ID = client.user.id;
  const GUILD_ID = "COLOQUE_AQUI_O_ID_DO_SERVIDOR";

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: [ajudaCommand.toJSON()] }
  );

  console.log("✅ /ajuda registrado");
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "ajuda") return;

  const embed = new EmbedBuilder()
    .setColor("#1f2c34")
    .setTitle("📜 Comandos RP")
    .addFields(
      { name: "!setrg", value: "Criar RG" },
      { name: "!rg", value: "Ver seu RG" },
      { name: "!consultar", value: "Consultar RG (staff)" },
      { name: "!rgeditar", value: "Editar nome do RG" },
      { name: "!rgdeletar", value: "Deletar RG" }
    )
    .setFooter({ text: "Laguna Roleplay" });

  await interaction.reply({ embeds: [embed], ephemeral: true });
});

// ================= LOGIN =================
client.login(process.env.TOKEN);
