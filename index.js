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
  return `${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}`;
}

function gerarRG() {
  let rg = "";
  for (let i = 0; i < 19; i++) rg += Math.floor(Math.random() * 10);
  return rg;
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
let rgs = load("./data/rgs.json");
let economia = load("./data/economia.json");

// ===== READY =====
client.once("ready", () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
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

    const nome = `${args[0]} ${args[1]}`;
    const estadoCivil = args[2];
    const nascimento = args[3];
    const genero = args[4];

    const ano = nascimento.split("/")[2];
    const idade = new Date().getFullYear() - ano;

    rgs[message.author.id] = {
      nome,
      rg: gerarRG(),
      cpf: gerarCPF(),
      estadoCivil,
      nascimento,
      idade,
      genero,
      status: "Válido",
      validade: "31/12/2026",
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
🆔 RG: ${rg.rg}
🎂 Idade: ${rg.idade}
📄 CPF: ${rg.cpf}
⚧ Gênero: ${rg.genero}
📅 Validade: ${rg.validade}
✅ Status: ${rg.status}`
      );

    message.channel.send({ embeds: [embed] });
  }

  // ===== CONSULTAR (STAFF) =====
  if (cmd === "consultar") {
    if (!isStaff(message.member))
      return message.reply("❌ Apenas staff");

    let rg;

    if (mention) rg = rgs[mention.id];
    else {
      const termo = args[0];
      rg = Object.values(rgs).find(r => r.cpf === termo || r.rg === termo);
    }

    if (!rg) return message.reply("❌ RG não encontrado");

    const embed = new EmbedBuilder()
      .setTitle("🔍 Consulta de RG")
      .setColor("Red")
      .setDescription(
`👤 Nome: ${rg.nome}
🆔 RG: ${rg.rg}
📄 CPF: ${rg.cpf}
🎂 Idade: ${rg.idade}
📅 Validade: ${rg.validade}
✅ Status: ${rg.status}`
      );

    message.channel.send({ embeds: [embed] });
  }

  // ===== EDITAR RG (STAFF) =====
  if (cmd === "rgeditar") {
    if (!isStaff(message.member)) return;
    if (!mention) return message.reply("❌ Marque um usuário");

    const campo = args[1];
    const valor = args.slice(2).join(" ");

    if (!rgs[mention.id]) return message.reply("❌ RG não encontrado");

    rgs[mention.id][campo] = valor;
    save("./data/rgs.json", rgs);

    message.reply("✅ RG atualizado");
  }

  // ===== DELETAR RG (STAFF) =====
  if (cmd === "rgdeletar") {
    if (!isStaff(message.member)) return;
    if (!mention) return;

    delete rgs[mention.id];
    save("./data/rgs.json", rgs);

    message.reply("🗑 RG deletado");
  }

  // ===== RENOVAR RG =====
  if (cmd === "renovarrg") {
    const rg = rgs[message.author.id];
    if (!rg) return;

    if (economia[message.author.id].carteira < 150)
      return message.reply("❌ Saldo insuficiente");

    economia[message.author.id].carteira -= 150;
    rg.validade = "31/12/2028";

    save("./data/rgs.json", rgs);
    save("./data/economia.json", economia);

    message.reply("✅ RG renovado por R$150");
  }

  // ===== SALDO =====
  if (cmd === "saldo") {
    message.reply(`💰 Carteira: R$${economia[message.author.id].carteira}`);
  }

  // ===== ADD MONEY =====
  if (cmd === "addmoney") {
    if (!isStaff(message.member)) return;

    const valor = Number(args[1]);
    if (!mention || !valor) return;

    economia[mention.id] ??= { carteira: 0 };
    economia[mention.id].carteira += valor;

    save("./data/economia.json", economia);

    logEconomia(message.guild, "💰 Dinheiro Adicionado",
      `Staff: ${message.author.tag}\nUsuário: ${mention.tag}\nValor: R$${valor}`);

    message.reply("✅ Dinheiro adicionado");
  }

  // ===== REMOVER MONEY =====
  if (cmd === "removermoney") {
    if (!isStaff(message.member)) return;

    const valor = Number(args[1]);
    if (!mention || !valor) return;

    economia[mention.id].carteira -= valor;
    if (economia[mention.id].carteira < 0) economia[mention.id].carteira = 0;

    save("./data/economia.json", economia);

    logEconomia(message.guild, "💸 Dinheiro Removido",
      `Staff: ${message.author.tag}\nUsuário: ${mention.tag}\nValor: R$${valor}`);

    message.reply("✅ Dinheiro removido");
  }

  // ===== TRANSFERIR =====
  if (cmd === "transferir") {
    const valor = Number(args[1]);
    if (!mention || !valor) return;

    if (economia[message.author.id].carteira < valor)
      return message.reply("❌ Saldo insuficiente");

    economia[message.author.id].carteira -= valor;
    economia[mention.id] ??= { carteira: 0 };
    economia[mention.id].carteira += valor;

    save("./data/economia.json", economia);

    logEconomia(message.guild, "🔁 Transferência",
      `${message.author.tag} → ${mention.tag}\nValor: R$${valor}`);

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
          .setDescription(ranking || "Sem dados"),
      ],
    });
  }
});

client.login(process.env.TOKEN);
