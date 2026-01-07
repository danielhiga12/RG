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

// ===== CARGOS =====
const CARGOS = {
  POLICIA: "Polícia",
  JUIZ: "Juiz",
  GOVERNADOR: "Governador",
  FUNDADOR: "Fundador"
};

// ===== CONFIG =====
const IMPOSTO_MULTA = 0.1;

// ===== FUNÇÕES =====
function load(file) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify({}, null, 2));
      return {};
    }

    const content = fs.readFileSync(file, "utf8");
    if (!content || content.trim() === "") {
      fs.writeFileSync(file, JSON.stringify({}, null, 2));
      return {};
    }

    return JSON.parse(content);
  } catch (e) {
    console.error("Erro no JSON:", file);
    fs.writeFileSync(file, JSON.stringify({}, null, 2));
    return {};
  }
}

function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function hasCargo(member, cargo) {
  return member.roles.cache.some(r => r.name === cargo);
}

function gerarCPF() {
  const n = () => Math.floor(Math.random() * 10);
  return `${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}-${n()}${n()}`;
}

function log(guild, canal, titulo, desc, cor = "Blue") {
  const c = guild.channels.cache.find(ch => ch.name === canal);
  if (!c) return;
  const e = new EmbedBuilder()
    .setTitle(titulo)
    .setDescription(desc)
    .setColor(cor)
    .setTimestamp();
  c.send({ embeds: [e] });
}

// ===== DADOS =====
let rgs = load("./data/rgs.json");
let economia = load("./data/economia.json");
let antecedentes = load("./data/antecedentes.json");
let mandados = load("./data/mandados.json");
let multas = load("./data/multas.json");
let processos = load("./data/processos.json");
let governo = load("./data/governo.json");
let veiculos = load("./data/veiculos.json");

// ===== READY =====
client.once("ready", () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
});

// ===== MESSAGE =====
client.on("messageCreate", async message => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(1).split(" ");
  const cmd = args.shift().toLowerCase();
  const user = message.mentions.users.first();

  economia[message.author.id] ??= { carteira: 0, banco: 0 };
  governo.caixa ??= 0;

  // ================= RG =================
  if (cmd === "setrg") {
    const t = args.join(" ").split(";");
    if (t.length < 4)
      return message.reply("Use: !setrg Nome;Estado Civil;DD/MM/AAAA;Gênero");

    const idade = new Date().getFullYear() - t[2].split("/")[2];

    rgs[message.author.id] = {
      nome: t[0],
      estado: t[1],
      idade,
      genero: t[3],
      cpf: gerarCPF(),
      status: "Válido",
      validade: "23/07/2026",
      cnh: "Regular"
    };

    save("./data/rgs.json", rgs);
    message.reply("🪪 RG criado com sucesso");
  }

  if (cmd === "consultar") {
    if (!hasCargo(message.member, CARGOS.POLICIA) && !hasCargo(message.member, CARGOS.JUIZ))
      return message.reply("❌ Sem permissão");

    if (!user || !rgs[user.id])
      return message.reply("❌ RG não encontrado");

    const rg = rgs[user.id];

    const emb = new EmbedBuilder()
      .setTitle("🪪 Carteira de Identidade")
      .setColor("Blue")
      .setDescription(
`👤 Nome: ${rg.nome}
🆔 RG: ${user.id}
💍 Estado Civil: ${rg.estado}
🎂 Idade: ${rg.idade}
📄 CPF: ${rg.cpf}
⚧ Gênero: ${rg.genero}
🚔 CNH: ${rg.cnh}
📋 Antecedentes: ${antecedentes[user.id]?.length || "Nenhum"}
✅ Status: ${rg.status}`
      );

    message.channel.send({ embeds: [emb] });
  }

  if (cmd === "rg") {
    if (!rgs[message.author.id])
      return message.reply("❌ Você não possui RG registrado");

    const rg = rgs[message.author.id];

    const emb = new EmbedBuilder()
      .setTitle("🪪 Seu RG")
      .setColor("Green")
      .setDescription(
`👤 Nome: ${rg.nome}
🆔 RG: ${message.author.id}
🎂 Idade: ${rg.idade}
📄 CPF: ${rg.cpf}
🚔 CNH: ${rg.cnh}
✅ Status: ${rg.status}`
      );

    message.channel.send({ embeds: [emb] });
  }

  // ================= ECONOMIA =================
  if (cmd === "saldo") {
    message.reply(
      `💰 Carteira: ${economia[message.author.id].carteira}\n🏦 Banco: ${economia[message.author.id].banco}`
    );
  }

  // ================= POLÍCIA =================
  if (cmd === "addmandado") {
    if (!hasCargo(message.member, CARGOS.POLICIA) || !user) return;
    mandados[user.id] = { motivo: args.slice(1).join(" "), ativo: true };
    save("./data/mandados.json", mandados);
    message.reply("🚨 Mandado criado");
  }

  if (cmd === "multar") {
    if (!hasCargo(message.member, CARGOS.POLICIA) || !user) return;

    const valor = Number(args[1]);
    if (isNaN(valor)) return;

    multas[user.id] ??= [];
    multas[user.id].push({ valor, motivo: args.slice(2).join(" ") });

    economia[user.id] ??= { carteira: 0, banco: 0 };
    economia[user.id].carteira -= valor;
    governo.caixa += valor * IMPOSTO_MULTA;

    save("./data/multas.json", multas);
    save("./data/economia.json", economia);
    save("./data/governo.json", governo);

    message.reply("🚔 Multa aplicada");
  }

  // ================= JUDICIÁRIO =================
  if (cmd === "abrirprocesso") {
    if (!hasCargo(message.member, CARGOS.JUIZ) || !user) return;
    processos[user.id] = { juiz: message.author.tag, status: "Aberto" };
    save("./data/processos.json", processos);
    message.reply("⚖️ Processo aberto");
  }

  if (cmd === "cassarcnh") {
    if (!hasCargo(message.member, CARGOS.JUIZ) || !user || !rgs[user.id]) return;
    rgs[user.id].cnh = "Cassada";
    save("./data/rgs.json", rgs);
    message.reply("🚫 CNH cassada");
  }

  // ================= VEÍCULOS =================
  if (cmd === "registrarveiculo") {
    if (!hasCargo(message.member, CARGOS.POLICIA) || !user) return;
    veiculos[args[0]] = { dono: user.id, status: "Regular" };
    save("./data/veiculos.json", veiculos);
    message.reply("🚗 Veículo registrado");
  }

  if (cmd === "buscarveiculo") {
    const v = veiculos[args[0]];
    if (!v) return message.reply("❌ Veículo não encontrado");
    message.reply(`🚗 Dono: <@${v.dono}> | Status: ${v.status}`);
  }

  // ================= GOVERNO =================
  if (cmd === "sitio") {
    if (!hasCargo(message.member, CARGOS.GOVERNADOR)) return;
    governo.sitio = true;
    save("./data/governo.json", governo);
    message.reply("🚨 Estado de sítio decretado");
  }

  if (cmd === "orcamento") {
    if (!hasCargo(message.member, CARGOS.GOVERNADOR)) return;
    message.reply(`🏛 Caixa do governo: ${governo.caixa}`);
  }

  // ================= AJUDA =================
  if (cmd === "ajuda") {
    message.reply(`
🪪 RG: !setrg !rg !consultar
💰 Economia: !saldo
🚔 Polícia: !addmandado !multar
⚖️ Judiciário: !abrirprocesso !cassarcnh
🚗 Veículos: !registrarveiculo !buscarveiculo
🏛 Governo: !sitio !orcamento
`);
  }
});

client.login(process.env.TOKEN);
