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
  if (!fs.existsSync(file)) fs.writeFileSync(file, "{}");
  return JSON.parse(fs.readFileSync(file));
}
function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function hasCargo(member, cargo) {
  return member.roles.cache.some(r => r.name === cargo);
}
function gerarCPF() {
  const n = () => Math.floor(Math.random() * 10);
  return `${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}`;
}
function log(guild, canal, titulo, desc, cor="Blue") {
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
    if (t.length < 4) return message.reply("Use: !setrg Nome;Estado Civil;DD/MM/AAAA;Gênero");

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

    if (!user || !rgs[user.id]) return message.reply("RG não encontrado");

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

  // ================= ECONOMIA =================
  if (cmd === "saldo") {
    message.reply(`💰 Carteira: ${economia[message.author.id].carteira}\n🏦 Banco: ${economia[message.author.id].banco}`);
  }

  if (cmd === "addmoney" && hasCargo(message.member, CARGOS.FUNDADOR)) {
    economia[user.id].carteira += Number(args[1]);
    save("./data/economia.json", economia);
    log(message.guild, "logs-economia", "💰 Dinheiro adicionado", `${user.tag}`);
  }

  if (cmd === "removermoney" && hasCargo(message.member, CARGOS.FUNDADOR)) {
    economia[user.id].carteira -= Number(args[1]);
    save("./data/economia.json", economia);
    log(message.guild, "logs-economia", "💸 Dinheiro removido", `${user.tag}`);
  }

  // ================= POLÍCIA =================
  if (cmd === "addmandado") {
    if (!hasCargo(message.member, CARGOS.POLICIA)) return;
    mandados[user.id] = { motivo: args.slice(1).join(" "), ativo: true };
    save("./data/mandados.json", mandados);
    log(message.guild, "logs-policia", "🚔 Mandado emitido", user.tag, "Red");
    message.reply("🚨 Mandado criado");
  }

  if (cmd === "removermandado") {
    if (!hasCargo(message.member, CARGOS.POLICIA)) return;
    delete mandados[user.id];
    save("./data/mandados.json", mandados);
    message.reply("✅ Mandado removido");
  }

  if (cmd === "multar") {
    if (!hasCargo(message.member, CARGOS.POLICIA)) return;

    const valor = Number(args[1]);
    const imposto = valor * IMPOSTO_MULTA;

    multas[user.id] ??= [];
    multas[user.id].push({ valor, motivo: args.slice(2).join(" ") });

    economia[user.id].carteira -= valor;
    governo.caixa += imposto;

    save("./data/multas.json", multas);
    save("./data/economia.json", economia);
    save("./data/governo.json", governo);

    log(message.guild, "logs-economia", "💸 Multa aplicada",
      `Valor: ${valor}\nImposto: ${imposto}`, "Red");

    message.reply("🚔 Multa registrada");
  }

  // ================= JUDICIÁRIO =================
  if (cmd === "abrirprocesso") {
    if (!hasCargo(message.member, CARGOS.JUIZ)) return;
    processos[user.id] = { juiz: message.author.tag, status: "Aberto" };
    save("./data/processos.json", processos);
    log(message.guild, "logs-judiciario", "⚖️ Processo aberto", user.tag);
  }

  if (cmd === "encerrarprocesso") {
    if (!hasCargo(message.member, CARGOS.JUIZ)) return;
    processos[user.id].status = "Encerrado";
    save("./data/processos.json", processos);
    message.reply("⚖️ Processo encerrado");
  }

  if (cmd === "suspendercnh") {
    if (!hasCargo(message.member, CARGOS.JUIZ)) return;
    rgs[user.id].cnh = "Suspensa";
    save("./data/rgs.json", rgs);
    message.reply("🚫 CNH suspensa");
  }

  // ================= GOVERNO =================
  if (cmd === "sitio") {
    if (!hasCargo(message.member, CARGOS.GOVERNADOR)) return;
    governo.sitio = true;
    save("./data/governo.json", governo);
    log(message.guild, "logs-governo", "🚨 Estado de Sítio", "Decretado", "DarkRed");
  }

  if (cmd === "orcamento") {
    if (!hasCargo(message.member, CARGOS.GOVERNADOR)) return;
    message.reply(`🏛 Caixa do Governo: ${governo.caixa}`);
  }

  // ================= AJUDA =================
  // ================= GOVERNO - REMOVER LEI =================
if (cmd === "removerlei") {
  if (!hasCargo(message.member, CARGOS.GOVERNADOR)) return;

  const index = Number(args[0]) - 1;
  if (isNaN(index) || !governo.leis?.[index]) return;

  const removida = governo.leis.splice(index, 1);
  save("./data/governo.json", governo);

  log(message.guild, "logs-governo",
    "🗑 Lei removida",
    removida[0]);

  message.reply("🗑 Lei removida");
}
  // ================= GOVERNO - ADD LEI =================
if (cmd === "addlei") {
  if (!hasCargo(message.member, CARGOS.GOVERNADOR)) return;

  const texto = args.join(" ");
  if (!texto) return;

  governo.leis ??= [];
  governo.leis.push(texto);

  save("./data/governo.json", governo);

  log(message.guild, "logs-governo",
    "📜 Nova Lei Criada",
    texto);

  message.reply("📜 Lei adicionada com sucesso");
}
  // ================= GOVERNO - LEIS =================
if (cmd === "leis") {
  governo.leis ??= [];

  if (governo.leis.length === 0)
    return message.reply("📜 Nenhuma lei cadastrada");

  message.reply(
    "📜 **Leis Ativas:**\n" +
    governo.leis.map((l, i) => `${i + 1}. ${l}`).join("\n")
  );
}
  // ================= GOVERNO - RETIRAR CAIXA =================
if (cmd === "retirarcaixa") {
  if (!hasCargo(message.member, CARGOS.GOVERNADOR)) return;

  const valor = Number(args[0]);
  if (isNaN(valor)) return;

  if (governo.caixa < valor)
    return message.reply("❌ Caixa insuficiente");

  governo.caixa -= valor;
  save("./data/governo.json", governo);

  log(message.guild, "logs-governo",
    "💸 Retirada do caixa",
    `Valor retirado: ${valor}`);

  message.reply("💸 Valor retirado do caixa do governo");
}
  // ================= GOVERNO - ADD CAIXA =================
if (cmd === "addcaixa") {
  if (!hasCargo(message.member, CARGOS.GOVERNADOR)) return;

  const valor = Number(args[0]);
  if (isNaN(valor)) return;

  governo.caixa += valor;
  save("./data/governo.json", governo);

  log(message.guild, "logs-governo",
    "💰 Caixa do governo",
    `Valor adicionado: ${valor}`);

  message.reply("💰 Valor adicionado ao caixa do governo");
}
  // ================= GOVERNO - DEFINIR IMPOSTO =================
if (cmd === "setimposto") {
  if (!hasCargo(message.member, CARGOS.GOVERNADOR)) return;

  const valor = Number(args[0]);
  if (isNaN(valor) || valor < 0 || valor > 1)
    return message.reply("Use: !setimposto 0.1 (ex: 10%)");

  governo.imposto = valor;
  save("./data/governo.json", governo);

  log(message.guild, "logs-governo",
    "🏛 Imposto alterado",
    `Novo imposto: ${valor * 100}%`);

  message.reply(`✅ Imposto definido para ${valor * 100}%`);
}
  // ================= RG (VER PRÓPRIO RG) =================
if (cmd === "rg") {
  if (!rgs[message.author.id])
    return message.reply("❌ Você não possui RG registrado");

  const rg = rgs[message.author.id];

  const emb = new EmbedBuilder()
    .setTitle("🪪 Seu Registro Geral")
    .setColor("Green")
    .setDescription(
`👤 Nome: ${rg.nome}
🆔 RG: ${message.author.id}
💍 Estado Civil: ${rg.estado}
🎂 Idade: ${rg.idade}
📄 CPF: ${rg.cpf}
⚧ Gênero: ${rg.genero}
🚔 CNH: ${rg.cnh}
📋 Antecedentes: ${antecedentes[message.author.id]?.length || "Nenhum"}
✅ Status: ${rg.status}
📆 Validade: ${rg.validade}`
    );

  message.channel.send({ embeds: [emb] });
}
  if (cmd === "iniciareleicao") {
  if (!hasCargo(message.member, CARGOS.GOVERNADOR)) return;
  governo.eleicao = { ativa: true, votos: {} };
  save("./data/governo.json", governo);
  message.reply("🗳 Eleição iniciada");
}

if (cmd === "votar") {
  if (!governo.eleicao?.ativa) return;
  governo.eleicao.votos[message.author.id] = user.id;
  save("./data/governo.json", governo);
  message.reply("🗳 Voto computado");
}

if (cmd === "finalizareleicao") {
  if (!hasCargo(message.member, CARGOS.GOVERNADOR)) return;
  governo.eleicao.ativa = false;
  save("./data/governo.json", governo);
  message.reply("🏛 Eleição finalizada");
}
  if (cmd === "cassarcnh") {
  if (!hasCargo(message.member, CARGOS.JUIZ)) return;
  rgs[user.id].cnh = "Cassada";
  save("./data/rgs.json", rgs);
  message.reply("🚫 CNH cassada");
}

if (cmd === "regularcnh") {
  if (!hasCargo(message.member, CARGOS.JUIZ)) return;
  rgs[user.id].cnh = "Regular";
  save("./data/rgs.json", rgs);
  message.reply("✅ CNH regularizada");
}

if (cmd === "invalidarrg") {
  if (!hasCargo(message.member, CARGOS.JUIZ)) return;
  rgs[user.id].status = "Inválido";
  save("./data/rgs.json", rgs);
}

if (cmd === "regularizarrg") {
  if (!hasCargo(message.member, CARGOS.JUIZ)) return;
  rgs[user.id].status = "Válido";
  save("./data/rgs.json", rgs);
}
  if (cmd === "trabalhar") {
  if (hasCargo(message.member, CARGOS.POLICIA) ||
      hasCargo(message.member, "Médico") ||
      hasCargo(message.member, "Paramédico")) {
    return message.reply("❌ Seu cargo já é um emprego");
  }

  economia[message.author.id].carteira += 300;
  save("./data/economia.json", economia);
  message.reply("💼 Você trabalhou e ganhou 300");
}
  if (cmd === "depositar") {
  const v = Number(args[0]);
  economia[message.author.id].carteira -= v;
  economia[message.author.id].banco += v;
  governo.caixa += v * 0.05;
  save("./data/economia.json", economia);
  save("./data/governo.json", governo);
  message.reply("🏦 Depósito realizado");
}

if (cmd === "sacar") {
  const v = Number(args[0]);
  economia[message.author.id].banco -= v;
  economia[message.author.id].carteira += v;
  save("./data/economia.json", economia);
  message.reply("💵 Saque realizado");
}
  if (cmd === "addantecedente") {
  if (!hasCargo(message.member, CARGOS.POLICIA)) return;
  antecedentes[user.id] ??= [];
  antecedentes[user.id].push(args.slice(1).join(" "));
  save("./data/antecedentes.json", antecedentes);
  message.reply("📋 Antecedente adicionado");
}

if (cmd === "verantecedentes") {
  if (!hasCargo(message.member, CARGOS.POLICIA) && !hasCargo(message.member, CARGOS.JUIZ)) return;
  const lista = antecedentes[user.id];
  message.reply(`📋 Antecedentes:\n${lista?.join("\n") || "Nenhum"}`);
}

if (cmd === "limparantecedentes") {
  if (!hasCargo(message.member, CARGOS.JUIZ)) return;
  antecedentes[user.id] = [];
  save("./data/antecedentes.json", antecedentes);
  message.reply("🧹 Antecedentes limpos");
}
  if (cmd === "registrarveiculo") {
  if (!hasCargo(message.member, CARGOS.POLICIA)) return;
  veiculos[args[0]] = { dono: user.id, status: "Regular" };
  save("./data/veiculos.json", veiculos);
  message.reply("🚗 Veículo registrado");
}

if (cmd === "buscarveiculo") {
  const v = veiculos[args[0]];
  if (!v) return message.reply("❌ Veículo não encontrado");
  message.reply(`🚗 Dono: <@${v.dono}> | Status: ${v.status}`);
}

if (cmd === "apreenderveiculo") {
  if (!hasCargo(message.member, CARGOS.POLICIA)) return;
  veiculos[args[0]].status = "Apreendido";
  save("./data/veiculos.json", veiculos);
  message.reply("🚨 Veículo apreendido");
}

if (cmd === "liberarveiculo") {
  if (!hasCargo(message.member, CARGOS.JUIZ)) return;
  veiculos[args[0]].status = "Regular";
  save("./data/veiculos.json", veiculos);
  message.reply("✅ Veículo liberado");
}
  if (cmd === "ajuda") {
    message.reply(`
🪪 RG: !setrg !consultar
💰 Economia: !saldo !addmoney !removermoney
🚔 Polícia: !addmandado !removermandado !multar
⚖️ Judiciário: !abrirprocesso !encerrarprocesso !suspendercnh
🏛 Governo: !sitio !orcamento
    `);
  }
});

client.login(process.env.TOKEN);
