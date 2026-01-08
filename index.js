const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = "!";

// ===== STAFF =====
const STAFF = [
  "Fundador",
  "Gerente de Comunidade",
  "Administrador",
  "Moderador",
];

// ===== FUNÇÕES =====
function load(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "{}");
  return JSON.parse(fs.readFileSync(file));
}

function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function isStaff(member) {
  return member.roles.cache.some(r => STAFF.includes(r.name));
}

function gerarCPF() {
  const n = () => Math.floor(Math.random() * 10);
  return `${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}-${n()}${n()}`;
}

function logEconomia(guild, titulo, descricao) {
  const canal = guild.channels.cache.find(c => c.name === "logs-economia");
  if (!canal) return;

  const embed = new EmbedBuilder()
    .setTitle(titulo)
    .setDescription(descricao)
    .setColor("Gold")
    .setTimestamp();

  canal.send({ embeds: [embed] });
}

// ===== DADOS =====
let economia = load("./data/economia.json");
let rgs = load("./data/rgs.json");

// ===== READY =====
client.once("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

// ===== COMANDOS =====
client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(1).trim().split(/ +/g);
  const cmd = args.shift().toLowerCase();
  const user = message.mentions.users.first();

  economia[message.author.id] ??= { carteira: 0 };

  // ===== SET RG =====
  if (cmd === "setrg") {
    if (args.length < 5)
      return message.reply("Use: !setrg Nome Sobrenome EstadoCivil DD/MM/AAAA Gênero");

    const nome = `${args[0]} ${args[1]}`;
    const estadoCivil = args[2];
    const nascimento = args[3];
    const genero = args[4];

    const idade = new Date().getFullYear() - nascimento.split("/")[2];

    rgs[message.author.id] = {
      nome,
      estadoCivil,
      nascimento,
      idade,
      genero,
      cpf: gerarCPF(),
      status: "Válido",
    };

    economia[message.author.id].carteira += 1000;

    save("./data/rgs.json", rgs);
    save("./data/economia.json", economia);

    message.reply("🪪 RG criado com sucesso!\n💰 R$1000 adicionados à carteira");
  }

  // ===== VER PRÓPRIO RG =====
  if (cmd === "rg") {
    const rg = rgs[message.author.id];
    if (!rg) return message.reply("❌ Você não possui RG");

    const embed = new EmbedBuilder()
      .setTitle("🪪 Registro Geral")
      .setColor("Blue")
      .setDescription(
`👤 Nome: ${rg.nome}
💍 Estado Civil: ${rg.estadoCivil}
🎂 Idade: ${rg.idade}
⚧ Gênero: ${rg.genero}
📄 CPF: ${rg.cpf}
✅ Status: ${rg.status}`
      );

    message.channel.send({ embeds: [embed] });
  }

  // ===== CONSULTAR (STAFF) =====
  if (cmd === "consultar") {
    if (!isStaff(message.member)) return message.reply("❌ Apenas staff");

    if (!user) return message.reply("❌ Marque um usuário");

    const rg = rgs[user.id];
    if (!rg) return message.reply("❌ RG não encontrado");

    message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🕵️ Consulta de RG")
          .setColor("Red")
          .setDescription(
`👤 Nome: ${rg.nome}
🎂 Idade: ${rg.idade}
📄 CPF: ${rg.cpf}
⚧ Gênero: ${rg.genero}
✅ Status: ${rg.status}`
          )
      ]
    });
  }

  // ===== SALDO =====
  if (cmd === "saldo") {
    message.reply(`💰 Carteira: R$${economia[message.author.id].carteira}`);
  }

  // ===== ADD MONEY =====
  if (cmd === "addmoney") {
    if (!isStaff(message.member)) return message.reply("❌ Sem permissão");
    if (!user) return message.reply("❌ Marque um usuário");

    const valor = Number(args[1]);
    if (!valor) return message.reply("❌ Valor inválido");

    economia[user.id] ??= { carteira: 0 };
    economia[user.id].carteira += valor;

    save("./data/economia.json", economia);

    logEconomia(
      message.guild,
      "💰 Dinheiro Adicionado",
      `${message.author.tag} adicionou R$${valor} para ${user.tag}`
    );

    message.reply("✅ Dinheiro adicionado");
  }

  // ===== REMOVER MONEY =====
  if (cmd === "removermoney") {
    if (!isStaff(message.member)) return message.reply("❌ Sem permissão");
    if (!user) return message.reply("❌ Marque um usuário");

    const valor = Number(args[1]);
    if (!valor) return message.reply("❌ Valor inválido");

    economia[user.id].carteira -= valor;
    save("./data/economia.json", economia);

    logEconomia(
      message.guild,
      "💸 Dinheiro Removido",
      `${message.author.tag} removeu R$${valor} de ${user.tag}`
    );

    message.reply("✅ Dinheiro removido");
  }

  // ===== TRANSFERIR =====
  if (cmd === "transferir") {
    if (!user) return message.reply("❌ Marque um usuário");

    const valor = Number(args[1]);
    if (!valor) return message.reply("❌ Valor inválido");
    if (economia[message.author.id].carteira < valor)
      return message.reply("❌ Saldo insuficiente");

    economia[message.author.id].carteira -= valor;
    economia[user.id] ??= { carteira: 0 };
    economia[user.id].carteira += valor;

    save("./data/economia.json", economia);

    logEconomia(
      message.guild,
      "🔁 Transferência",
      `${message.author.tag} transferiu R$${valor} para ${user.tag}`
    );

    message.reply("✅ Transferência realizada");
  }

  // ===== TOP 10 =====
  if (cmd === "top10") {
    const ranking = Object.entries(economia)
      .sort((a, b) => b[1].carteira - a[1].carteira)
      .slice(0, 10)
      .map(([id, d], i) => `${i + 1}. <@${id}> — R$${d.carteira}`)
      .join("\n");

    message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🏆 Top 10 Mais Ricos")
          .setColor("Green")
          .setDescription(ranking || "Sem dados")
      ]
    });
  }
});

client.login(process.env.TOKEN);
