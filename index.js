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
      cnh: "Sem CNH"
    };

    economia[message.author.id].carteira += 1000;
    save("./data/rgs.json", rgs);
    save("./data/economia.json", economia);
    message.reply("🪪 RG criado com sucesso e 1000 depositados!");
  }

  if (cmd === "rg") {
    if (!rgs[message.author.id]) return message.reply("❌ Você não possui RG registrado");

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

  if (cmd === "consultar") {
    if (!hasCargo(message.member, CARGOS.POLICIA) && !hasCargo(message.member, CARGOS.JUIZ))
      return message.reply("❌ Sem permissão");

    let alvo;
    if (user) alvo = user.id;
    else if (args[0]) alvo = Object.keys(rgs).find(id => rgs[id].cpf === args[0] || id === args[0]);
    if (!alvo || !rgs[alvo]) return message.reply("RG não encontrado");

    const rg = rgs[alvo];
    const emb = new EmbedBuilder()
      .setTitle("🪪 Carteira de Identidade")
      .setColor("Blue")
      .setDescription(
`👤 Nome: ${rg.nome}
🆔 RG: ${alvo}
💍 Estado Civil: ${rg.estado}
🎂 Idade: ${rg.idade}
📄 CPF: ${rg.cpf}
⚧ Gênero: ${rg.genero}
🚔 CNH: ${rg.cnh}
📋 Antecedentes: ${antecedentes[alvo]?.length || "Nenhum"}
✅ Status: ${rg.status}`
      );
    message.channel.send({ embeds: [emb] });
  }

  // ================= ECONOMIA =================
  if (cmd === "saldo") {
    message.reply(`💰 Carteira: ${economia[message.author.id].carteira}\n🏦 Banco: ${economia[message.author.id].banco}`);
  }

  if (cmd === "transferir") {
    if (!user) return message.reply("❌ Mencione para quem transferir");
    const valor = Number(args[0]);
    if (isNaN(valor) || valor <= 0) return message.reply("❌ Valor inválido");
    if (economia[message.author.id].carteira < valor) return message.reply("❌ Saldo insuficiente");

    economia[message.author.id].carteira -= valor;
    economia[user.id] ??= { carteira: 0, banco: 0 };
    economia[user.id].carteira += valor;
    save("./data/economia.json", economia);

    message.reply(`💸 Transferidos ${valor} para ${user.tag}`);
  }

  if ((cmd === "addmoney" || cmd === "removermoney") && !hasCargo(message.member, CARGOS.FUNDADOR))
    return message.reply("❌ Apenas Fundador pode usar este comando");

  if (cmd === "addmoney") {
    economia[user.id].carteira += Number(args[0]);
    save("./data/economia.json", economia);
    log(message.guild, "logs-economia", "💰 Dinheiro adicionado", `${user.tag}`, "Green");
  }

  if (cmd === "removermoney") {
    economia[user.id].carteira -= Number(args[0]);
    save("./data/economia.json", economia);
    log(message.guild, "logs-economia", "💸 Dinheiro removido", `${user.tag}`, "Red");
  }

  if (cmd === "top10") {
    const top = Object.entries(economia)
      .sort((a,b) => (b[1].carteira + b[1].banco) - (a[1].carteira + a[1].banco))
      .slice(0,10)
      .map((e,i) => `${i+1}. <@${e[0]}> - ${e[1].carteira + e[1].banco}`);
    message.reply("💰 **Top 10 Mais Ricos:**\n" + top.join("\n"));
  }

  // ================= POLÍCIA =================
  if (cmd === "addmandado") {
    if (!hasCargo(message.member, CARGOS.POLICIA)) return;
    mandados[user.id] = { motivo: args.slice(1).join(" "), ativo: true };
    save("./data/mandados.json", mandados);
    message.reply("🚨 Mandado criado");
  }

  if (cmd === "removermandado") {
    if (!hasCargo(message.member, CARGOS.POLICIA)) return;
    delete mandados[user.id];
    save("./data/mandados.json", mandados);
    message.reply("✅ Mandado removido");
  }

  if (cmd === "mandadosativos") {
    if (!hasCargo(message.member, CARGOS.POLICIA)) return;
    const ativos = Object.entries(mandados).filter(([id,m]) => m.ativo);
    if (!ativos.length) return message.reply("🚔 Nenhum mandado ativo");
    message.reply("🚔 Mandados ativos:\n" + ativos.map(([id,m]) => `<@${id}> - ${m.motivo}`).join("\n"));
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

  // ================= CNH =================
  if (cmd === "tirarcnh") {
    if (!rgs[message.author.id]) return message.reply("❌ Você precisa ter RG para tirar a CNH");
    const custo = 3500;
    if (economia[message.author.id].carteira < custo) return message.reply(`❌ Você precisa de ${custo} na carteira para tirar a CNH`);

    economia[message.author.id].carteira -= custo;
    rgs[message.author.id].cnh = "Regular";
    save("./data/economia.json", economia);
    save("./data/rgs.json", rgs);

    message.reply(`✅ CNH obtida! ${custo} descontados`);
  }

  // ================= JUDICIÁRIO =================
  if (cmd === "abrirprocesso") {
    if (!hasCargo(message.member, CARGOS.JUIZ)) return;
    processos[user.id] = { juiz: message.author.tag, status: "Aberto" };
    save("./data/processos.json", processos);
    message.reply("⚖️ Processo aberto");
  }

  if (cmd === "encerrarprocesso") {
    if (!hasCargo(message.member, CARGOS.JUIZ)) return;
    processos[user.id].status = "Encerrado";
    save("./data/processos.json", processos);
    message.reply("⚖️ Processo encerrado");
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
    message.reply("❌ RG invalidado");
  }

  if (cmd === "regularizarrg") {
    if (!hasCargo(message.member, CARGOS.JUIZ)) return;
    rgs[user.id].status = "Válido";
    save("./data/rgs.json", rgs);
    message.reply("✅ RG regularizado");
  }

  // ================= AJUDA =================
  if (cmd === "ajuda") {
    message.reply(`
🪪 RG: !setrg !rg !consultar
💰 Economia: !saldo !transferir !addmoney !removermoney !top10
🚔 Polícia: !addmandado !removermandado !mandadosativos !multar !addantecedente !verantecedentes !limparantecedentes
🚦 Veículos: !registrarveiculo !buscarveiculo !apreenderveiculo !liberarveiculo
⚖️ Judiciário: !abrirprocesso !encerrarprocesso !cassarcnh !regularcnh !invalidarrg !regularizarrg !removercnh
🚦 CNH: !tirarcnh
    `);
  }

});

client.login(process.env.TOKEN);
