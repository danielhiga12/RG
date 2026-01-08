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
const STAFF = ["Fundador", "Gerente de Comunidade", "Administrador", "Moderador"];

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

function gerarNumero19() {
  let n = "";
  for (let i = 0; i < 19; i++) n += Math.floor(Math.random() * 10);
  return n;
}

function gerarCPF() {
  return `9.${gerarNumero19().slice(0,3)}.${gerarNumero19().slice(3,6)}.${gerarNumero19().slice(6,9)}.${gerarNumero19().slice(9,11)}`;
}

function logEconomia(guild, titulo, desc) {
  const canal = guild.channels.cache.find(c => c.name === "logs-economia");
  if (!canal) return;

  const embed = new EmbedBuilder()
    .setTitle(titulo)
    .setDescription(desc)
    .setColor("Gold")
    .setTimestamp();

  canal.send({ embeds: [embed] });
}

// ===== DADOS =====
let rgs = load("./data/rgs.json");
let economia = load("./data/economia.json");

// ===== READY =====
client.once("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

// ===== COMANDOS =====
client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(1).trim().split(/ +/g);
  const cmd = args.shift().toLowerCase();
  const mention = message.mentions.users.first();

  economia[message.author.id] ??= { carteira: 0 };

  // ===== SET RG =====
  if (cmd === "setrg") {
    if (args.length < 5)
      return message.reply("❌ Use: !setrg Nome Sobrenome EstadoCivil DD/MM/AAAA Gênero");

    const nascimento = args[3];
    const idade = new Date().getFullYear() - nascimento.split("/")[2];

    rgs[message.author.id] = {
      nome: `${args[0]} ${args[1]}`,
      estadoCivil: args[2],
      nascimento,
      idade,
      genero: args[4],
      rg: gerarNumero19(),
      cpf: gerarCPF(),
      validade: "23/07/2026",
      status: "Válido",
    };

    economia[message.author.id].carteira += 1000;

    save("./data/rgs.json", rgs);
    save("./data/economia.json", economia);

    message.reply("🪪 RG criado com sucesso\n💰 1000$ adicionados à carteira");
  }

  // ===== RG =====
  if (cmd === "rg") {
    const rg = rgs[message.author.id];
    if (!rg) return message.reply("❌ Você não possui RG");

    const embed = new EmbedBuilder()
      .setTitle("🪪 Registro Geral")
      .setColor("Blue")
      .setDescription(
`👤 **Nome:** ${rg.nome}
🆔 **RG:** ${rg.rg}
🎂 **Idade:** ${rg.idade}
📄 **CPF:** ${rg.cpf}
⚧ **Gênero:** ${rg.genero}
📅 **Validade:** ${rg.validade}
✅ **Status:** ${rg.status}`
      );

    message.channel.send({ embeds: [embed] });
  }

  // ===== CONSULTAR (STAFF) =====
  if (cmd === "consultar") {
    if (!isStaff(message.member)) return message.reply("❌ Apenas staff");

    const busca = args[0];
    let rg;

    if (mention) rg = rgs[mention.id];
    else rg = Object.values(rgs).find(r => r.cpf === busca || r.rg === busca);

    if (!rg) return message.reply("❌ RG não encontrado");

    message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🕵️ Consulta RG")
          .setColor("Red")
          .setDescription(
`👤 **Nome:** ${rg.nome}
🆔 **RG:** ${rg.rg}
📄 **CPF:** ${rg.cpf}
📅 **Validade:** ${rg.validade}
✅ **Status:** ${rg.status}`
          )
      ]
    });
  }

  // ===== RENOVAR RG =====
  if (cmd === "renovarrg") {
    const rg = rgs[message.author.id];
    if (!rg) return message.reply("❌ Você não possui RG");

    if (economia[message.author.id].carteira < 150)
      return message.reply("❌ Saldo insuficiente (150$)");

    economia[message.author.id].carteira -= 150;
    rg.validade = "23/07/2028";

    save("./data/rgs.json", rgs);
    save("./data/economia.json", economia);

    message.reply("✅ RG renovado com sucesso (-150$)");
  }

  // ===== SALDO =====
  if (cmd === "saldo") {
    message.reply(`💰 Carteira: ${economia[message.author.id].carteira}$`);
  }

  // ===== ADD MONEY =====
  if (cmd === "addmoney") {
    if (!isStaff(message.member)) return message.reply("❌ Sem permissão");
    if (!mention) return message.reply("❌ Marque um usuário");

    const valor = Number(args[1]);
    if (!valor) return message.reply("❌ Valor inválido");

    economia[mention.id] ??= { carteira: 0 };
    economia[mention.id].carteira += valor;

    save("./data/economia.json", economia);

    logEconomia(
      message.guild,
      "💰 Dinheiro Adicionado",
      `👤 ${message.author.tag}\n👥 ${mention.tag}\n💵 ${valor}$`
    );

    message.reply("✅ Dinheiro adicionado");
  }

  // ===== REMOVER MONEY =====
  if (cmd === "removermoney") {
    if (!isStaff(message.member)) return message.reply("❌ Sem permissão");
    if (!mention) return message.reply("❌ Marque um usuário");

    const valor = Number(args[1]);
    if (!valor) return message.reply("❌ Valor inválido");

    economia[mention.id].carteira -= valor;
    save("./data/economia.json", economia);

    logEconomia(
      message.guild,
      "💸 Dinheiro Removido",
      `👤 ${message.author.tag}\n👥 ${mention.tag}\n💵 ${valor}$`
    );

    message.reply("✅ Dinheiro removido");
  }

  // ===== TRANSFERIR =====
  if (cmd === "transferir") {
    if (!mention) return message.reply("❌ Marque um usuário");

    const valor = Number(args[1]);
    if (!valor) return message.reply("❌ Valor inválido");

    if (economia[message.author.id].carteira < valor)
      return message.reply("❌ Saldo insuficiente");

    economia[message.author.id].carteira -= valor;
    economia[mention.id] ??= { carteira: 0 };
    economia[mention.id].carteira += valor;

    save("./data/economia.json", economia);

    logEconomia(
      message.guild,
      "🔁 Transferência",
      `👤 ${message.author.tag}\n➡️ ${mention.tag}\n💵 ${valor}$`
    );

    message.reply("✅ Transferência realizada");
  }

  // ===== TOP 10 =====
  if (cmd === "top10") {
    const top = Object.entries(economia)
      .sort((a,b) => b[1].carteira - a[1].carteira)
      .slice(0,10)
      .map((e,i)=>`${i+1}. <@${e[0]}> — ${e[1].carteira}$`)
      .join("\n");

    message.channel.send({
      embeds: [new EmbedBuilder().setTitle("🏆 Top 10 Ricos").setDescription(top).setColor("Green")]
    });
  }
});

client.login(process.env.TOKEN);
