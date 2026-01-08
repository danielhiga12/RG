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

// ===== CARGOS STAFF =====
const STAFF = [
  "Fundador",
  "Gerente de Comunidade",
  "Monitor",
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

function gerarNumero(tamanho) {
  let n = "";
  for (let i = 0; i < tamanho; i++) n += Math.floor(Math.random() * 10);
  return n;
}

function gerarCPF() {
  return `${gerarNumero(1)}.${gerarNumero(3)}.${gerarNumero(3)}.${gerarNumero(3)}.${gerarNumero(3)}.${gerarNumero(2)}`;
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
      validade: Date.now() + 1000 * 60 * 60 * 24 * 365,
      status: "Válido",
    };

    economia[message.author.id].carteira += 1000;

    save("./data/rgs.json", rgs);
    save("./data/economia.json", economia);

    message.reply("🪪 RG criado com sucesso | 💰 R$1000 adicionados");
  }

  // ===== VER RG =====
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
📅 **Validade:** ${new Date(rg.validade).toLocaleDateString()}
✅ **Status:** ${rg.status}`
      );

    message.channel.send({ embeds: [embed] });
  }

  // ===== RENOVAR RG =====
  if (cmd === "renovarrg") {
    const rg = rgs[message.author.id];
    if (!rg) return message.reply("❌ Você não possui RG");
    if (economia[message.author.id].carteira < 150)
      return message.reply("❌ Você precisa de R$150");

    economia[message.author.id].carteira -= 150;
    rg.validade = Date.now() + 1000 * 60 * 60 * 24 * 365;
    rg.status = "Válido";

    save("./data/rgs.json", rgs);
    save("./data/economia.json", economia);

    message.reply("✅ RG renovado com sucesso");
  }

  // ===== CONSULTAR (STAFF) =====
  if (cmd === "consultar") {
    if (!isStaff(message.member)) return message.reply("❌ Apenas staff");

    let alvo;
    if (user) alvo = rgs[user.id];
    else {
      const busca = args.join(" ");
      alvo = Object.values(rgs).find(r => r.cpf === busca || r.rg === busca);
    }

    if (!alvo) return message.reply("❌ RG não encontrado");

    message.reply(`🪪 **RG:** ${alvo.rg}\n📄 **CPF:** ${alvo.cpf}`);
  }

  // ===== RG EDITAR / DELETAR =====
  if (cmd === "rgdeletar") {
    if (!isStaff(message.member) || !user) return;
    delete rgs[user.id];
    save("./data/rgs.json", rgs);
    message.reply("🗑️ RG deletado");
  }

  // ===== ECONOMIA =====
  if (cmd === "saldo") {
    message.reply(`💰 Carteira: R$${economia[message.author.id].carteira}`);
  }

  if (cmd === "addmoney" || cmd === "removermoney") {
    if (!isStaff(message.member) || !user) return;

    const valor = Number(args[1]?.replace("$", ""));
    if (!valor) return;

    economia[user.id] ??= { carteira: 0 };
    economia[user.id].carteira += cmd === "addmoney" ? valor : -valor;

    save("./data/economia.json", economia);

    logEconomia(
      message.guild,
      cmd === "addmoney" ? "💰 Dinheiro Adicionado" : "💸 Dinheiro Removido",
      `👤 Staff: ${message.author.tag}\n👥 Usuário: ${user.tag}\n💵 Valor: R$${valor}`
    );

    message.reply("✅ Operação realizada");
  }

  if (cmd === "transferir") {
    if (!user) return;
    const valor = Number(args[1]);
    if (economia[message.author.id].carteira < valor) return;

    economia[message.author.id].carteira -= valor;
    economia[user.id] ??= { carteira: 0 };
    economia[user.id].carteira += valor;

    save("./data/economia.json", economia);

    logEconomia(
      message.guild,
      "🔁 Transferência",
      `👤 ${message.author.tag} ➜ ${user.tag}\n💵 R$${valor}`
    );

    message.reply("✅ Transferência realizada");
  }

  if (cmd === "top10") {
    const ranking = Object.entries(economia)
      .sort((a, b) => b[1].carteira - a[1].carteira)
      .slice(0, 10)
      .map(([id, d], i) => `**${i + 1}.** <@${id}> — R$${d.carteira}`)
      .join("\n");

    message.channel.send({
      embeds: [new EmbedBuilder().setTitle("🏆 Top 10 Ricos").setDescription(ranking)]
    });
  }
});

client.login(process.env.TOKEN);
